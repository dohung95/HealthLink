import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { paymentApi } from '../../../api/paymentApi';

const formatCurrency = (value) => {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatStatus = (status) => {
  if (!status) return 'Pending';
  return String(status)
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getStatusClassName = (status) => {
  const normalized = String(status || '').toUpperCase();
  if (['PAID', 'COMPLETED', 'SETTLED'].includes(normalized)) {
    return 'bg-success/10 text-success';
  }
  if (['FAILED', 'REFUNDED', 'CANCELLED'].includes(normalized)) {
    return 'bg-critical/10 text-critical';
  }
  if (['PROCESSING', 'PENDING'].includes(normalized)) {
    return 'bg-warning/10 text-warning';
  }
  return 'bg-surface-container text-text-muted';
};

export default function DoctorWalletTab({ profile, onRefreshProfile }) {
  const doctorId = profile?.doctorId || profile?.doctorID;
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedEntryId, setExpandedEntryId] = useState(null);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [paypalEmail, setPaypalEmail] = useState(profile?.paypalEmail || '');
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    setPaypalEmail(profile?.paypalEmail || '');
  }, [profile?.paypalEmail]);

  useEffect(() => {
    if (!isWithdrawModalOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isWithdrawModalOpen]);

  const loadWallet = useCallback(async () => {
    if (!doctorId) return;
    setLoading(true);
    try {
      const [balanceData, transactionData, settlementData] = await Promise.all([
        paymentApi.getPartnerBalance(doctorId, 'DOCTOR'),
        paymentApi.getPartnerTransactions(doctorId),
        paymentApi.getPartnerSettlements(doctorId),
      ]);
      setBalance(balanceData);
      setTransactions(Array.isArray(transactionData) ? transactionData : []);
      setSettlements(Array.isArray(settlementData) ? settlementData : []);
    } catch (error) {
      console.error('Failed to load wallet', error);
      toast.error(error.response?.data?.message || 'Unable to load wallet.');
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  const availableBalance = Number(balance?.pendingBalance ?? profile?.pendingSettlement ?? 0);
  const totalEarnings = Number(balance?.totalEarnings ?? profile?.totalEarnings ?? 0);
  const requestedAmount = Number(withdrawAmount || 0);
  const remainingAfterWithdrawal = availableBalance - requestedAmount;
  const canWithdraw =
    requestedAmount > 0 &&
    remainingAfterWithdrawal > 10 &&
    paypalEmail.trim().length > 0 &&
    !withdrawing;
  const eligibleForWithdrawal = Boolean(balance?.eligibleForWithdrawal ?? availableBalance > 10);
  const withdrawalStatus = balance?.withdrawalStatus || (eligibleForWithdrawal ? 'Wallet is ready.' : 'Minimum balance is $10.00.');

  const history = useMemo(() => {
    const earningEntries = transactions.map((item, index) => ({
      kind: 'earning',
      id: `earning-${item.transactionId ?? item.transactionNumber ?? index}`,
      title: `Consultation - Appointment #${item.appointmentId || '-'}`,
      amount: item.netAmount,
      status: item.status,
      createdAt: item.createdAt,
      raw: item,
    }));

    const withdrawalEntries = settlements.map((item, index) => ({
      kind: 'withdrawal',
      id: `withdrawal-${item.settlementId ?? item.settlementNumber ?? index}`,
      title: item.settlementNumber || `Withdrawal #${item.settlementId || '-'}`,
      amount: Number(item.netAmount || 0) * -1,
      status: item.status,
      createdAt: item.createdAt,
      raw: item,
    }));

    return [...earningEntries, ...withdrawalEntries].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
  }, [transactions, settlements]);

  const handleWithdraw = async (event) => {
    event.preventDefault();
    if (!canWithdraw) return;

    setWithdrawing(true);
    try {
      await paymentApi.requestPartnerSettlement(
        doctorId,
        {
          amount: requestedAmount,
          paypalEmail: paypalEmail.trim(),
          notes: 'Doctor wallet withdrawal request',
        },
        'DOCTOR'
      );
      toast.success('Withdrawal request submitted.');
      setWithdrawAmount('');
      setIsWithdrawModalOpen(false);
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
    <div className="doctor-wallet-tab flex flex-col gap-4">
      <section className="overflow-hidden rounded-lg bg-primary p-4 text-on-primary shadow-sm md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-1 text-sm text-on-primary-container">Available Balance</p>
            <h2 className="mb-0 text-2xl font-bold tracking-tight md:text-[28px]">{formatCurrency(availableBalance)}</h2>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <WalletHeroMetric label="Total Earnings" value={formatCurrency(totalEarnings)} />
              <div className="hidden h-9 w-px bg-on-primary/25 sm:block" />
              <WalletHeroMetric label="Withdrawal Status" value={eligibleForWithdrawal ? 'Ready' : 'On Hold'} />
            </div>
          </div>

          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-on-primary px-5 py-3 text-sm font-semibold text-primary shadow-sm transition hover:bg-surface-container-lowest disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
            disabled={!doctorId || !eligibleForWithdrawal}
            onClick={() => setIsWithdrawModalOpen(true)}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">payments</span>
            Withdraw via PayPal
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-surface-border bg-surface-container-lowest shadow-sm">
        <div className="flex flex-col gap-3 border-b border-surface-border bg-surface-bright p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="mb-1 text-lg font-semibold text-text-main">Recent Transactions</h3>
            <p className="mb-0 text-sm text-text-muted">{withdrawalStatus}</p>
          </div>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm font-semibold text-on-surface transition hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
            onClick={loadWallet}
            type="button"
          >
            <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
            Refresh
          </button>
        </div>

        {loading ? (
          <EmptyWalletState icon="progress_activity" title="Loading wallet..." />
        ) : history.length === 0 ? (
          <EmptyWalletState icon="receipt_long" title="No wallet transactions yet." />
        ) : (
          <ul className="mb-0 divide-y divide-surface-border p-0">
            {history.map((entry) => {
              const isExpanded = expandedEntryId === entry.id;
              const isCredit = Number(entry.amount) >= 0;

              return (
                <li className="list-none" key={entry.id}>
                  <button
                    aria-expanded={isExpanded}
                    className="flex w-full items-center justify-between gap-4 p-4 text-left transition hover:bg-surface-container-low"
                    onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                    type="button"
                  >
                    <span className="flex min-w-0 items-center gap-4">
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${entry.kind === 'earning' ? 'bg-primary-fixed/60 text-primary' : 'bg-surface-container-high text-text-main'}`}>
                        <span className="material-symbols-outlined text-[20px]">
                          {entry.kind === 'earning' ? 'video_camera_front' : 'account_balance'}
                        </span>
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-text-main">{entry.title}</span>
                        <span className="mt-0.5 block text-xs font-medium text-text-muted">{formatDateTime(entry.createdAt)}</span>
                      </span>
                    </span>

                    <span className="flex shrink-0 items-center gap-3">
                      <span className="text-right">
                        <span className={`block text-sm font-semibold ${isCredit ? 'text-success' : 'text-text-main'}`}>
                          {isCredit ? '+' : ''}
                          {formatCurrency(entry.amount)}
                        </span>
                        <span className={`mt-1 inline-flex rounded px-2 py-0.5 text-xs font-semibold ${getStatusClassName(entry.status)}`}>
                          {formatStatus(entry.status)}
                        </span>
                      </span>
                      <span className="material-symbols-outlined text-[20px] text-text-muted">
                        {isExpanded ? 'expand_less' : 'expand_more'}
                      </span>
                    </span>
                  </button>

                  {isExpanded ? (
                    <div className="px-4 pb-4">
                      <div className="rounded-lg bg-surface-container-low p-4">
                        {entry.kind === 'earning' ? (
                          <>
                            <DetailRow label="Time" value={formatDateTime(entry.raw.createdAt)} />
                            <DetailRow label="Appointment ID" value={`#${entry.raw.appointmentId || '-'}`} />
                            <DetailRow label="Appointment amount" value={formatCurrency(entry.raw.grossAmount)} valueClassName="text-success" />
                            <DetailRow label="Commission" value={`-${formatCurrency(entry.raw.commissionAmount).replace('-', '')}`} valueClassName="text-critical" />
                            <DetailRow label="Net received" value={formatCurrency(entry.raw.netAmount)} valueClassName="text-success" />
                          </>
                        ) : (
                          <>
                            <DetailRow label="Time" value={formatDateTime(entry.raw.createdAt)} />
                            <DetailRow label="Settlement" value={entry.raw.settlementNumber || entry.raw.settlementId || '-'} />
                            <DetailRow label="PayPal" value={entry.raw.paypalEmail || '-'} />
                            <DetailRow label="Amount" value={`-${formatCurrency(entry.raw.netAmount).replace('-', '')}`} valueClassName="text-critical" />
                            <DetailRow label="Status" value={formatStatus(entry.raw.status)} />
                          </>
                        )}
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {isWithdrawModalOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setIsWithdrawModalOpen(false)}
          role="dialog"
        >
          <section
            className="w-full max-w-md overflow-hidden rounded-xl border border-surface-border bg-surface-container-lowest shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-surface-border bg-surface-bright px-6 py-4">
              <h3 className="mb-0 text-lg font-semibold text-text-main">Withdraw Funds</h3>
              <button
                className="rounded-full p-1 text-on-surface-variant transition hover:bg-surface-container hover:text-text-main"
                onClick={() => setIsWithdrawModalOpen(false)}
                type="button"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form className="p-5" onSubmit={handleWithdraw}>
              <div className="mb-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Transfer to</p>
                <label className="flex items-center gap-3 rounded-lg border border-primary-fixed-dim bg-surface p-3">
                  <span className="material-symbols-outlined text-primary">account_balance_wallet</span>
                  <input
                    className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-text-main outline-none focus:ring-0"
                    onChange={(event) => setPaypalEmail(event.target.value)}
                    placeholder="doctor@example.com"
                    type="email"
                    value={paypalEmail}
                  />
                </label>
                <p className="mb-0 mt-2 text-xs text-text-muted">Must match the PayPal email saved in your profile.</p>
              </div>

              <div className="mb-5">
                <div className="mb-2 flex items-end justify-between gap-3">
                  <label className="text-xs font-semibold uppercase tracking-wide text-text-muted" htmlFor="doctor-withdraw-amount">
                    Amount
                  </label>
                  <span className="text-xs font-semibold text-text-muted">Available: {formatCurrency(availableBalance)}</span>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-text-main">$</span>
                  <input
                    className="w-full rounded-lg border border-surface-border bg-surface py-2.5 pl-8 pr-4 text-lg font-semibold text-text-main outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                    id="doctor-withdraw-amount"
                    min="0"
                    onChange={(event) => setWithdrawAmount(event.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    type="number"
                    value={withdrawAmount}
                  />
                </div>
                <p className={`mb-0 mt-2 text-xs ${requestedAmount <= 0 ? 'text-text-muted' : remainingAfterWithdrawal > 10 ? 'text-success' : 'text-critical'}`}>
                  Remaining balance after withdrawal must be greater than $10.00.
                </p>
              </div>

              <div className="mb-6 rounded-lg bg-surface-container-low p-4">
                <DetailRow label="Withdrawal Amount" value={formatCurrency(requestedAmount)} />
                <DetailRow label="Fee (0%)" value={formatCurrency(0)} />
                <DetailRow label="Total to Receive" value={formatCurrency(requestedAmount)} valueClassName="text-text-main" strong />
              </div>

              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-on-primary shadow-sm transition hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!canWithdraw}
                type="submit"
              >
                {withdrawing ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                    Submitting...
                  </>
                ) : (
                  'Confirm Withdrawal'
                )}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function WalletHeroMetric({ label, value }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs font-semibold uppercase tracking-wide text-on-primary-container">{label}</span>
      <span className="text-base font-semibold text-on-primary">{value}</span>
    </div>
  );
}

function EmptyWalletState({ icon, title }) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-10 text-center text-text-muted">
      <span className="material-symbols-outlined mb-2 text-3xl">{icon}</span>
      <p className="mb-0 text-sm font-semibold">{title}</p>
    </div>
  );
}

function DetailRow({ label, value, valueClassName = 'text-text-main', strong = false }) {
  const ValueTag = strong ? 'strong' : 'span';

  return (
    <div className="flex justify-between gap-4 border-b border-surface-border py-2 last:border-b-0">
      <span className="text-sm text-text-muted">{label}</span>
      <ValueTag className={`text-right text-sm font-semibold ${valueClassName}`}>{value}</ValueTag>
    </div>
  );
}
