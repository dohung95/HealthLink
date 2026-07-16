import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { paymentApi } from '@api/paymentApi';
import { usePartnerWallet } from '@hooks/wallet/usePartnerWallet';
import { doctorTheme } from '../wallet/walletTheme';
import WalletHeroSection from '../wallet/WalletHeroSection';
import WalletTransactionFilters from '../wallet/WalletTransactionFilters';
import WalletTransactionList from '../wallet/WalletTransactionList';
import WalletPagination from '../wallet/WalletPagination';
import WithdrawalModal from '../wallet/WithdrawalModal';
import DoctorWithdrawalSecurityCard from './DoctorWithdrawalSecurityCard';
import '../wallet/wallet-shared.css';

const createWithdrawalRequestId = () => globalThis.crypto?.randomUUID?.()
  || `withdrawal-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function DoctorWalletTab({ profile, onRefreshProfile }) {
  const doctorId = profile?.doctorId || profile?.doctorID;
  const wallet = usePartnerWallet({ partnerId: doctorId, partnerType: 'DOCTOR', pageSize: 10 });
  const [showModal, setShowModal] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const withdrawalRequestIdRef = useRef(null);

  useEffect(() => {
    if (wallet.error) {
      toast.error(wallet.error.response?.data?.message || 'Unable to load wallet.');
    }
  }, [wallet.error]);

  const availableBalance = Number(wallet.balance?.availableBalance ?? wallet.balance?.pendingBalance ?? profile?.pendingSettlement ?? 0);
  const eligibleForWithdrawal = Boolean(wallet.balance?.eligibleForWithdrawal ?? availableBalance > 10);
  const maxAmount = Math.max(0, availableBalance - 10);
  const filtersActive = Boolean(
    wallet.filters.searchTerm
    || wallet.filters.dateFrom
    || wallet.filters.dateTo
    || wallet.filters.typeFilter !== 'all'
    || wallet.filters.statusFilter !== 'all',
  );

  const closeWithdrawal = () => {
    if (withdrawing) return;
    withdrawalRequestIdRef.current = null;
    setShowModal(false);
  };

  const handleWithdraw = async ({ amount, paypalEmail, pin }) => {
    if (withdrawing) return;
    setWithdrawing(true);
    const requestId = withdrawalRequestIdRef.current || createWithdrawalRequestId();
    withdrawalRequestIdRef.current = requestId;
    try {
      await paymentApi.requestPartnerSettlement(
        doctorId,
        { amount, paypalEmail, pin, requestId, notes: 'Doctor wallet withdrawal request' },
        'DOCTOR',
      );
      toast.success('Withdrawal request submitted.');
      withdrawalRequestIdRef.current = null;
      setShowModal(false);
      await Promise.all([wallet.refresh(), onRefreshProfile?.()]);
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
        <WalletTransactionFilters {...wallet.filterControls} />

        <WalletTransactionList
          transactions={wallet.entries}
          loading={wallet.loading}
          filtersActive={filtersActive}
          onRefresh={wallet.refresh}
          refreshLoading={wallet.loading}
        />

        <WalletPagination
          page={wallet.page + 1}
          totalItems={wallet.totalElements}
          pageSize={10}
          onPageChange={(nextPage) => wallet.setPage(nextPage - 1)}
        />
      </section>

      <WithdrawalModal
        show={showModal}
        onClose={closeWithdrawal}
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
