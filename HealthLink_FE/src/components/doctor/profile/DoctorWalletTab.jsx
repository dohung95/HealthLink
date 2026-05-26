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
    return 'doctor-wallet-item__status-badge--paid';
  }
  if (['FAILED', 'REFUNDED', 'CANCELLED'].includes(normalized)) {
    return 'doctor-wallet-item__status-badge--failed';
  }
  if (['PROCESSING', 'PENDING'].includes(normalized)) {
    return 'doctor-wallet-item__status-badge--pending';
  }
  return 'doctor-wallet-item__status-badge--default';
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
    <div className="doctor-wallet-tab">
      <section className="doctor-wallet-hero">
        <div className="d-flex flex-column gap-3 flex-md-row align-items-md-end justify-content-md-between">
          <div>
            <p className="doctor-wallet-hero__balance-label">Available Balance</p>
            <h2 className="doctor-wallet-hero__balance-value">{formatCurrency(availableBalance)}</h2>

            <div className="doctor-wallet-hero__metrics">
              <WalletHeroMetric label="Total Earnings" value={formatCurrency(totalEarnings)} />
              <div className="d-none d-sm-block" style={{width:'1px',height:'2.25rem',background:'rgba(255,255,255,0.25)'}} />
              <WalletHeroMetric label="Withdrawal Status" value={eligibleForWithdrawal ? 'Ready' : 'On Hold'} />
            </div>
          </div>

          <button
            className="doctor-wallet-hero__withdraw-btn"
            disabled={!doctorId || !eligibleForWithdrawal}
            onClick={() => setIsWithdrawModalOpen(true)}
            type="button"
          >
            <span className="material-symbols-outlined" style={{fontSize:'1.125rem'}}>payments</span>
            Withdraw via PayPal
          </button>
        </div>
      </section>

      <section className="doctor-wallet-transactions">
        <div className="doctor-wallet-transactions__header">
          <div>
            <h3 className="doctor-wallet-transactions__title">Recent Transactions</h3>
            <p className="doctor-wallet-transactions__status">{withdrawalStatus}</p>
          </div>
          <button
            className="doctor-wallet-transactions__refresh-btn"
            disabled={loading}
            onClick={loadWallet}
            type="button"
          >
            <span className={`material-symbols-outlined doctor-wallet-transactions__refresh-icon ${loading ? 'doctor-wallet-transactions__refresh-icon--spinning' : ''}`}>refresh</span>
            Refresh
          </button>
        </div>

        {loading ? (
          <EmptyWalletState icon="progress_activity" title="Loading wallet..." />
        ) : history.length === 0 ? (
          <EmptyWalletState icon="receipt_long" title="No wallet transactions yet." />
        ) : (
          <ul className="mb-0 p-0">
            {history.map((entry) => {
              const isExpanded = expandedEntryId === entry.id;
              const isCredit = Number(entry.amount) >= 0;

              return (
                <li className="doctor-wallet-item" key={entry.id}>
                  <button
                    aria-expanded={isExpanded}
                    className="doctor-wallet-item__btn"
                    onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                    type="button"
                  >
                    <span className="doctor-wallet-item__left">
                      <span className={`doctor-wallet-item__icon-wrap ${entry.kind === 'earning' ? 'doctor-wallet-item__icon-wrap--earning' : 'doctor-wallet-item__icon-wrap--withdrawal'}`}>
                        <span className="material-symbols-outlined">
                          {entry.kind === 'earning' ? 'video_camera_front' : 'account_balance'}
                        </span>
                      </span>
                      <span className="doctor-wallet-item__info">
                        <span className="doctor-wallet-item__title">{entry.title}</span>
                        <span className="doctor-wallet-item__date">{formatDateTime(entry.createdAt)}</span>
                      </span>
                    </span>

                    <span className="doctor-wallet-item__right">
                      <span className="text-end">
                        <span className={`doctor-wallet-item__amount ${isCredit ? 'doctor-wallet-item__amount--credit' : 'doctor-wallet-item__amount--debit'}`}>
                          {isCredit ? '+' : ''}
                          {formatCurrency(entry.amount)}
                        </span>
                        <span className={`doctor-wallet-item__status-badge ${getStatusClassName(entry.status)}`}>
                          {formatStatus(entry.status)}
                        </span>
                      </span>
                      <span className={`material-symbols-outlined doctor-wallet-item__chevron ${isExpanded ? 'doctor-wallet-item__chevron--expanded' : ''}`}>
                        expand_more
                      </span>
                    </span>
                  </button>

                  {isExpanded ? (
                    <div className="doctor-wallet-item__expand">
                      <div className="doctor-wallet-item__detail">
                        {entry.kind === 'earning' ? (
                          <>
                            <DetailRow label="Time" value={formatDateTime(entry.raw.createdAt)} />
                            <DetailRow label="Appointment ID" value={`#${entry.raw.appointmentId || '-'}`} />
                            <DetailRow label="Appointment amount" value={formatCurrency(entry.raw.grossAmount)} valueClassName="success" />
                            <DetailRow label="Commission" value={`-${formatCurrency(entry.raw.commissionAmount).replace('-', '')}`} valueClassName="error" />
                            <DetailRow label="Net received" value={formatCurrency(entry.raw.netAmount)} valueClassName="success" />
                          </>
                        ) : (
                          <>
                            <DetailRow label="Time" value={formatDateTime(entry.raw.createdAt)} />
                            <DetailRow label="Settlement" value={entry.raw.settlementNumber || entry.raw.settlementId || '-'} />
                            <DetailRow label="PayPal" value={entry.raw.paypalEmail || '-'} />
                            <DetailRow label="Amount" value={`-${formatCurrency(entry.raw.netAmount).replace('-', '')}`} valueClassName="error" />
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
          className="doctor-wallet-modal-overlay"
          onClick={() => setIsWithdrawModalOpen(false)}
          role="dialog"
        >
          <section
            className="doctor-wallet-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="doctor-wallet-modal__header">
              <h3 className="doctor-wallet-modal__title">Withdraw Funds</h3>
              <button
                className="doctor-wallet-modal__close"
                onClick={() => setIsWithdrawModalOpen(false)}
                type="button"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form className="doctor-wallet-modal__body" onSubmit={handleWithdraw}>
              <div className="mb-3">
                <p className="doctor-wallet-modal__label">Transfer to</p>
                <div className="doctor-wallet-modal__input-group">
                  <span className="material-symbols-outlined">account_balance_wallet</span>
                  <input
                    className="doctor-wallet-modal__email-input"
                    onChange={(event) => setPaypalEmail(event.target.value)}
                    placeholder="doctor@example.com"
                    type="email"
                    value={paypalEmail}
                  />
                </div>
                <p className="doctor-wallet-modal__hint">Must match the PayPal email saved in your profile.</p>
              </div>

              <div className="mb-3">
                <div className="doctor-wallet-modal__amount-row">
                  <label className="doctor-wallet-modal__amount-label" htmlFor="doctor-withdraw-amount">
                    Amount
                  </label>
                  <span className="doctor-wallet-modal__available">Available: {formatCurrency(availableBalance)}</span>
                </div>
                <div className="doctor-wallet-modal__amount-input-wrap">
                  <span className="doctor-wallet-modal__dollar-sign">$</span>
                  <input
                    className="doctor-wallet-modal__amount-input"
                    id="doctor-withdraw-amount"
                    min="0"
                    onChange={(event) => setWithdrawAmount(event.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    type="number"
                    value={withdrawAmount}
                  />
                </div>
                <p className={`doctor-wallet-modal__threshold-hint ${requestedAmount <= 0 ? 'doctor-wallet-modal__threshold-hint--muted' : remainingAfterWithdrawal > 10 ? 'doctor-wallet-modal__threshold-hint--success' : 'doctor-wallet-modal__threshold-hint--error'}`}>
                  Remaining balance after withdrawal must be greater than $10.00.
                </p>
              </div>

              <div className="doctor-wallet-modal__summary">
                <DetailRow label="Withdrawal Amount" value={formatCurrency(requestedAmount)} />
                <DetailRow label="Fee (0%)" value={formatCurrency(0)} />
                <DetailRow label="Total to Receive" value={formatCurrency(requestedAmount)} strong />
              </div>

              <button
                className="doctor-wallet-modal__submit-btn"
                disabled={!canWithdraw}
                type="submit"
              >
                {withdrawing ? (
                  <>
                    <span className="material-symbols-outlined doctor-wallet-modal__spinner">progress_activity</span>
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
    <div className="d-flex flex-column">
      <span className="text-xs fw-semibold text-uppercase tracking-wide text-on-primary-container">{label}</span>
      <span className="text-base fw-semibold text-on-primary">{value}</span>
    </div>
  );
}

function EmptyWalletState({ icon, title }) {
  return (
    <div className="doctor-wallet-empty">
      <span className="material-symbols-outlined doctor-wallet-empty__icon">{icon}</span>
      <p className="doctor-wallet-empty__title">{title}</p>
    </div>
  );
}

function DetailRow({ label, value, valueClassName, strong = false }) {
  const ValueTag = strong ? 'strong' : 'span';
  const valueClass = valueClassName
    ? `doctor-wallet-item__detail-value doctor-wallet-item__detail-value--${valueClassName}`
    : 'doctor-wallet-item__detail-value';

  return (
    <div className="doctor-wallet-item__detail-row">
      <span className="doctor-wallet-item__detail-label">{label}</span>
      <ValueTag className={valueClass}>{value}</ValueTag>
    </div>
  );
}
