import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { paymentApi } from '../../api/paymentApi';
import { pharmacyTheme } from '../wallet/walletTheme';
import WalletHeroSection from '../wallet/WalletHeroSection';
import WalletTransactionFilters from '../wallet/WalletTransactionFilters';
import WalletTransactionList from '../wallet/WalletTransactionList';
import WalletPagination from '../wallet/WalletPagination';
import WithdrawalModal from '../wallet/WithdrawalModal';
import '../wallet/wallet-shared.css';

export default function PharmacyWalletTab({ profile, balance, transactions, settlements, pharmacyId, reload, loading: parentLoading }) {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [showModal, setShowModal] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const pendingBalance = Number(balance?.pendingBalance ?? profile?.pendingSettlement ?? 0);
  const eligibleForWithdrawal = Boolean(balance?.eligibleForWithdrawal ?? pendingBalance > 10);
  const maxAmount = Math.max(0, pendingBalance - 10);

  const history = useMemo(() => {
    const earnings = (transactions || []).map((item, index) => ({
      kind: 'earning',
      id: `earning-${item.transactionId ?? item.transactionNumber ?? index}`,
      title: (item.sourceType === 'APPOINTMENT' ? 'Appointment' : 'Order') + ' #' + (item.appointmentId || item.pharmacyOrderId || '-'),
      amount: Number(item.netAmount || 0),
      status: item.status,
      createdAt: item.createdAt,
      raw: item,
    }));
    const withdrawals = (settlements || []).map((item, index) => ({
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

  const filtered = useMemo(() => {
    let f = [...history];
    const term = searchTerm.toLowerCase();
    if (term) {
      f = f.filter((e) =>
        e.title.toLowerCase().includes(term) ||
        (e.raw.appointmentId?.toString() || '').includes(term) ||
        (e.raw.pharmacyOrderId?.toString() || '').includes(term) ||
        (e.raw.settlementNumber?.toLowerCase() || '').includes(term)
      );
    }
    if (dateFrom) f = f.filter((e) => new Date(e.createdAt) >= dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      f = f.filter((e) => new Date(e.createdAt) <= end);
    }
    if (typeFilter !== 'all') f = f.filter((e) => e.kind === typeFilter);
    if (statusFilter !== 'all') {
      const m = { completed: ['PAID', 'COMPLETED', 'SETTLED'], pending: ['PROCESSING', 'PENDING'], failed: ['FAILED', 'REFUNDED', 'CANCELLED'] };
      f = f.filter((e) => (m[statusFilter] || []).includes((e.status || '').toUpperCase()));
    }
    return f;
  }, [history, searchTerm, dateFrom, dateTo, typeFilter, statusFilter]);

  useEffect(() => { setPage(1); }, [searchTerm, dateFrom, dateTo, typeFilter, statusFilter]);

  const displayData = filtered;
  const totalItems = displayData.length;
  const pagedData = displayData.slice((page - 1) * pageSize, page * pageSize);

  const filtersActive = !!(searchTerm || dateFrom || dateTo || typeFilter !== 'all' || statusFilter !== 'all');

  const handleWithdraw = async ({ amount, paypalEmail, pin }) => {
    if (withdrawing) return;
    setWithdrawing(true);
    try {
      await paymentApi.requestPartnerSettlement(
        pharmacyId,
        { amount, paypalEmail, pin, notes: 'Pharmacy wallet withdrawal request' },
        'PHARMACY'
      );
      toast.success('Withdrawal request submitted.');
      setShowModal(false);
      await reload?.();
    } catch (error) {
      console.error('Withdrawal failed', error);
      toast.error(error.response?.data?.message || 'Unable to submit withdrawal.');
    } finally {
      setWithdrawing(false);
    }
  };

  if (parentLoading && !balance) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center py-5">
        <div className="spinner-border mb-3" role="status" style={{ width: '2.5rem', height: '2.5rem', color: 'var(--pharmacy-primary)' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="fw-semibold" style={{ color: 'var(--pharmacy-muted)' }}>Loading wallet...</p>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column gap-4" style={{ maxWidth: '860px', margin: '0 auto', width: '100%' }}>
      <WalletHeroSection
        pendingBalance={pendingBalance}
        eligibleForWithdrawal={eligibleForWithdrawal}
        onWithdrawClick={() => setShowModal(true)}
        disabled={!pharmacyId}
        theme={pharmacyTheme}
      />

      <section className="wallet-tx-section wallet-card-shadow">
        <WalletTransactionFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
        />

        <WalletTransactionList
          transactions={pagedData}
          loading={parentLoading}
          filtersActive={filtersActive}
          onRefresh={reload}
          refreshLoading={parentLoading}
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
        theme={pharmacyTheme}
        withdrawing={withdrawing}
        registeredPaypalEmail={profile?.paypalEmail || ''}
        paypalReadOnly
        pinRequired
      />
    </div>
  );
}
