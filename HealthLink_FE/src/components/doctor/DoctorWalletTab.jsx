import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { paymentApi } from '@api/paymentApi';
import { doctorTheme } from '../wallet/walletTheme';
import WalletHeroSection from '../wallet/WalletHeroSection';
import WalletTransactionFilters from '../wallet/WalletTransactionFilters';
import WalletTransactionList from '../wallet/WalletTransactionList';
import WalletPagination from '../wallet/WalletPagination';
import WithdrawalModal from '../wallet/WithdrawalModal';
import DoctorWithdrawalSecurityCard from './DoctorWithdrawalSecurityCard';
import '../wallet/wallet-shared.css';

export default function DoctorWalletTab({ profile, onRefreshProfile, filters, filterControls }) {
  const doctorId = profile?.doctorId || profile?.doctorID;
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [showModal, setShowModal] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const loadWallet = useCallback(async () => {
    if (!doctorId) return;
    setLoading(true);
    try {
      const [b, t, s] = await Promise.all([
        paymentApi.getPartnerBalance(doctorId, 'DOCTOR'),
        paymentApi.getPartnerTransactions(doctorId),
        paymentApi.getPartnerSettlements(doctorId),
      ]);
      setBalance(b);
      setTransactions(Array.isArray(t) ? t : []);
      setSettlements(Array.isArray(s) ? s : []);
    } catch (error) {
      console.error('Failed to load wallet', error);
      toast.error(error.response?.data?.message || 'Unable to load wallet.');
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => { loadWallet(); }, [loadWallet]);

  const availableBalance = Number(balance?.pendingBalance ?? profile?.pendingSettlement ?? 0);
  const eligibleForWithdrawal = Boolean(balance?.eligibleForWithdrawal ?? availableBalance > 10);
  const maxAmount = Math.max(0, availableBalance - 10);

  const history = useMemo(() => {
    const earnings = transactions.map((item, index) => ({
      kind: 'earning',
      id: `earning-${item.transactionId ?? item.transactionNumber ?? index}`,
      title: `Consultation - Appointment #${item.appointmentId || '-'}`,
      amount: item.netAmount,
      status: item.status,
      createdAt: item.createdAt,
      raw: item,
    }));
    const withdrawals = settlements.map((item, index) => ({
      kind: 'withdrawal',
      id: `withdrawal-${item.settlementId ?? item.settlementNumber ?? index}`,
      title: item.settlementNumber || `Withdrawal #${item.settlementId || '-'}`,
      amount: Number(item.netAmount || 0) * -1,
      status: item.status,
      createdAt: item.createdAt,
      raw: item,
    }));
    return [...earnings, ...withdrawals].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
  }, [transactions, settlements]);

  const localFilteredHistory = useMemo(() => {
    if (!filters) return null;
    let f = [...history];
    const term = (filters.searchTerm || '').toLowerCase();
    if (term) {
      f = f.filter((e) =>
        e.title.toLowerCase().includes(term) ||
        (e.raw.appointmentId?.toString() || '').includes(term) ||
        (e.raw.settlementNumber?.toLowerCase() || '').includes(term)
      );
    }
    if (filters.dateFrom) f = f.filter((e) => new Date(e.createdAt) >= filters.dateFrom);
    if (filters.dateTo) {
      const end = new Date(filters.dateTo);
      end.setHours(23, 59, 59, 999);
      f = f.filter((e) => new Date(e.createdAt) <= end);
    }
    if (filters.typeFilter && filters.typeFilter !== 'all') {
      f = f.filter((e) => e.kind === filters.typeFilter);
    }
    if (filters.statusFilter && filters.statusFilter !== 'all') {
      const m = { completed: ['PAID', 'COMPLETED', 'SETTLED'], pending: ['PROCESSING', 'PENDING'], failed: ['FAILED', 'REFUNDED', 'CANCELLED'] };
      f = f.filter((e) => (m[filters.statusFilter] || []).includes((e.status || '').toUpperCase()));
    }
    return f;
  }, [filters, history]);

  useEffect(() => { setPage(1); }, [filters, history]);

  const displayData = localFilteredHistory ?? history;
  const totalItems = displayData.length;
  const pagedData = displayData.slice((page - 1) * pageSize, page * pageSize);

  const handleWithdraw = async ({ amount, paypalEmail, pin }) => {
    if (withdrawing) return;
    setWithdrawing(true);
    try {
      await paymentApi.requestPartnerSettlement(
        doctorId,
        { amount, paypalEmail, pin, notes: 'Doctor wallet withdrawal request' },
        'DOCTOR'
      );
      toast.success('Withdrawal request submitted.');
      setShowModal(false);
      await loadWallet();
      await onRefreshProfile?.();
    } catch (error) {
      console.error('Withdrawal failed', error);
      toast.error(error.response?.data?.message || 'Unable to submit withdrawal.');
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      <WalletHeroSection
        pendingBalance={availableBalance}
        eligibleForWithdrawal={eligibleForWithdrawal}
        onWithdrawClick={() => setShowModal(true)}
        disabled={!doctorId}
        theme={doctorTheme}
      />

      <DoctorWithdrawalSecurityCard compact />

      <section className="wallet-tx-section wallet-card-shadow">
        {filterControls && (
          <WalletTransactionFilters
            searchTerm={filterControls.searchTerm}
            setSearchTerm={filterControls.setSearchTerm}
            dateFrom={filterControls.dateFrom}
            setDateFrom={filterControls.setDateFrom}
            dateTo={filterControls.dateTo}
            setDateTo={filterControls.setDateTo}
            typeFilter={filterControls.typeFilter}
            setTypeFilter={filterControls.setTypeFilter}
            statusFilter={filterControls.statusFilter}
            setStatusFilter={filterControls.setStatusFilter}
          />
        )}

        <WalletTransactionList
          transactions={pagedData}
          loading={loading}
          filtersActive={!!filters}
          onRefresh={loadWallet}
          refreshLoading={loading}
        />

        <WalletPagination
          page={page}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </section>

      <WithdrawalModal
        show={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleWithdraw}
        maxAmount={maxAmount}
        theme={doctorTheme}
        withdrawing={withdrawing}
        registeredPaypalEmail={profile?.paypalEmail || ''}
        paypalReadOnly={Boolean(profile?.paypalEmail)}
      />
    </div>
  );
}
