import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { paymentApi } from '@api/paymentApi';

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

const getStatusBadgeClass = (status) => {
  const normalized = String(status || '').toUpperCase();
  if (['PAID', 'COMPLETED', 'SETTLED'].includes(normalized)) return 'bg-success-subtle text-success border-success-subtle';
  if (['FAILED', 'REFUNDED', 'CANCELLED'].includes(normalized)) return 'bg-danger-subtle text-danger border-danger-subtle';
  if (['PROCESSING', 'PENDING'].includes(normalized)) return 'bg-warning-subtle text-warning-emphasis border-warning-subtle';
  return 'bg-body-tertiary text-body-tertiary border-secondary-subtle';
};

const StatusBadge = ({ status }) => (
  <span className={`badge border rounded-pill fw-bold px-2 py-1 ${getStatusBadgeClass(status)}`} style={{ fontSize: '0.625rem', lineHeight: 1.4 }}>
    {formatStatus(status)}
  </span>
);

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
    <div className="d-flex flex-column gap-4">
      {/* ========== WALLET HERO ========== */}
      <section
        className="card border-0 overflow-hidden shadow-sm"
        style={{ borderRadius: '1.25rem', background: 'var(--surface)' }}
      >
        <div className="card-body p-0">
          <div
            className="p-4 p-md-5 text-white position-relative"
            style={{
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 50%, var(--primary-active) 100%)',
            }}
          >
            {/* Decorative accent circles */}
            <div
              className="position-absolute rounded-circle"
              style={{
                width: '12rem',
                height: '12rem',
                background: 'rgba(255,255,255,0.04)',
                top: '-4rem',
                right: '-3rem',
                pointerEvents: 'none',
              }}
            />
            <div
              className="position-absolute rounded-circle"
              style={{
                width: '6rem',
                height: '6rem',
                background: 'rgba(255,255,255,0.06)',
                bottom: '-1rem',
                right: '4rem',
                pointerEvents: 'none',
              }}
            />

            <div className="d-flex flex-column gap-4 flex-md-row align-items-md-end justify-content-md-between position-relative">
              <div>
                <p
                  className="text-white-50 text-uppercase small fw-semibold mb-2 d-inline-flex align-items-center gap-1"
                  style={{ letterSpacing: '0.05em', fontSize: '0.75rem' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>account_balance_wallet</span>
                  Available Balance
                </p>
                <h2
                  className="display-4 fw-bold mb-0"
                  style={{ letterSpacing: '-0.03em', lineHeight: 1.1 }}
                >
                  {formatCurrency(availableBalance)}
                </h2>

                <div className="d-flex align-items-center gap-4 gap-md-5 mt-3">
                  <div>
                    <span
                      className="text-white-50 text-uppercase small fw-semibold d-block"
                      style={{ fontSize: '0.6875rem', letterSpacing: '0.05em' }}
                    >
                      Total Earnings
                    </span>
                    <span className="fw-bold" style={{ fontSize: '1.0625rem' }}>{formatCurrency(totalEarnings)}</span>
                  </div>
                  <div style={{ width: '1px', height: '2.5rem', background: 'rgba(255,255,255,0.2)' }} />
                  <div>
                    <span
                      className="text-white-50 text-uppercase small fw-semibold d-block"
                      style={{ fontSize: '0.6875rem', letterSpacing: '0.05em' }}
                    >
                      Withdrawal Status
                    </span>
                    <span className="d-inline-flex align-items-center gap-1 fw-bold" style={{ fontSize: '1.0625rem' }}>
                      <span
                        className="d-inline-block rounded-circle"
                        style={{
                          width: '0.5rem',
                          height: '0.5rem',
                          background: eligibleForWithdrawal ? 'var(--success)' : 'var(--warning)',
                          boxShadow: eligibleForWithdrawal
                            ? '0 0 0 2px rgba(16, 185, 129, 0.3)'
                            : '0 0 0 2px rgba(217, 119, 6, 0.3)',
                        }}
                      />
                      {eligibleForWithdrawal ? 'Ready' : 'On Hold'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                className="btn fw-semibold shadow-sm d-inline-flex align-items-center gap-2 px-4 py-2 border-0"
                disabled={!doctorId || !eligibleForWithdrawal}
                onClick={() => setIsWithdrawModalOpen(true)}
                type="button"
                style={{
                  borderRadius: '0.625rem',
                  fontSize: '0.875rem',
                  background: 'rgba(255,255,255,0.15)',
                  color: '#fff',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>payments</span>
                Withdraw via PayPal
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========== TRANSACTIONS ========== */}
      <section
        className="card border-0 shadow-sm overflow-hidden"
        style={{ borderRadius: '1.25rem', background: 'var(--surface)' }}
      >
        {/* Header */}
        <div className="d-flex align-items-center justify-content-between px-4 py-3 border-bottom" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h5 className="fw-bold mb-0" style={{ color: 'var(--text-primary)', fontSize: '0.9375rem' }}>
              <span
                className="material-symbols-outlined me-2"
                style={{ fontSize: '1.125rem', color: 'var(--primary)', verticalAlign: 'middle' }}
              >
                receipt_long
              </span>
              Recent Transactions
            </h5>
            <p className="small fw-medium mb-0 mt-1" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              <span
                className={`d-inline-block rounded-circle me-1 ${eligibleForWithdrawal ? 'bg-success' : 'bg-warning'}`}
                style={{ width: '0.375rem', height: '0.375rem', verticalAlign: 'middle' }}
              />
              {withdrawalStatus}
            </p>
          </div>
          <button
            className="btn btn-sm fw-semibold d-inline-flex align-items-center gap-1 border-0"
            disabled={loading}
            onClick={loadWallet}
            type="button"
            style={{
              background: 'var(--surface-muted)',
              borderRadius: '0.5rem',
              fontSize: '0.8125rem',
              color: 'var(--text-secondary)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.background = 'var(--surface-hover)';
              }
            }}
            onMouseLeave={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.background = 'var(--surface-muted)';
              }
            }}
          >
            {loading
              ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
              : <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>refresh</span>
            }
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {/* Transaction list */}
        {loading ? (
          <div className="d-flex flex-column align-items-center justify-content-center py-5" style={{ minHeight: '12rem' }}>
            <div
              className="spinner-border mb-3"
              role="status"
              style={{ width: '2.5rem', height: '2.5rem', color: 'var(--primary)' }}
            >
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="fw-semibold mb-0" style={{ color: 'var(--text-primary)' }}>Loading wallet...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="d-flex flex-column align-items-center justify-content-center py-5" style={{ minHeight: '12rem' }}>
            <div
              className="d-flex align-items-center justify-content-center rounded-circle mb-3"
              style={{ width: '3.5rem', height: '3.5rem', background: 'var(--surface-muted)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>receipt_long</span>
            </div>
            <p className="fw-semibold mb-0" style={{ color: 'var(--text-primary)', fontSize: '0.9375rem' }}>No wallet transactions yet.</p>
            <p className="small mb-0 mt-1" style={{ color: 'var(--text-muted)' }}>Your consultation earnings will appear here.</p>
          </div>
        ) : (
          <div className="list-group list-group-flush border-0">
            {history.map((entry) => {
              const isExpanded = expandedEntryId === entry.id;
              const isCredit = Number(entry.amount) >= 0;

              return (
                <div key={entry.id} className="border-0" style={{ borderBottom: '1px solid var(--border)' }}>
                  <button
                    aria-expanded={isExpanded}
                    className="list-group-item list-group-item-action d-flex align-items-center justify-content-between gap-3 px-4 py-3 border-0 w-100 text-start"
                    onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                    type="button"
                    style={{
                      background: isExpanded ? 'var(--surface-muted)' : 'transparent',
                      transition: 'background 0.12s ease',
                      cursor: 'pointer',
                    }}
                  >
                    <span className="d-flex align-items-center gap-3 min-w-0">
                      <span
                        className={`d-flex align-items-center justify-content-center rounded-circle flex-shrink-0 ${entry.kind === 'earning' ? '' : ''}`}
                        style={{
                          width: '2.5rem',
                          height: '2.5rem',
                          background: entry.kind === 'earning' ? 'var(--primary-light)' : 'var(--surface-muted)',
                          color: entry.kind === 'earning' ? 'var(--primary)' : 'var(--text-secondary)',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
                          {entry.kind === 'earning' ? 'video_camera_front' : 'account_balance'}
                        </span>
                      </span>
                      <span className="min-w-0">
                        <span
                          className="d-block fw-semibold text-truncate"
                          style={{ color: 'var(--text-primary)', fontSize: '0.8125rem' }}
                        >
                          {entry.title}
                        </span>
                        <span
                          className="d-block small"
                          style={{ color: 'var(--text-muted)', fontSize: '0.6875rem', marginTop: '0.125rem' }}
                        >
                          {formatDateTime(entry.createdAt)}
                        </span>
                      </span>
                    </span>

                    <span className="d-flex align-items-center gap-2 flex-shrink-0">
                      <span className="text-end">
                        <span
                          className={`d-block fw-bold text-nowrap ${isCredit ? '' : ''}`}
                          style={{
                            fontSize: '0.8125rem',
                            color: isCredit ? 'var(--success)' : 'var(--text-primary)',
                          }}
                        >
                          {isCredit ? '+' : ''}{formatCurrency(entry.amount)}
                        </span>
                        <StatusBadge status={entry.status} />
                      </span>
                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontSize: '1.125rem',
                          color: 'var(--text-muted)',
                          transition: 'transform 0.12s ease',
                          transform: isExpanded ? 'rotate(180deg)' : 'none',
                        }}
                      >
                        expand_more
                      </span>
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-3" style={{ background: 'var(--surface-muted)' }}>
                      <div className="rounded-3 p-3" style={{ background: 'var(--surface)' }}>
                        {entry.kind === 'earning' ? (
                          <>
                            <DetailRow label="Time" value={formatDateTime(entry.raw.createdAt)} />
                            <DetailRow label="Appointment ID" value={`#${entry.raw.appointmentId || '-'}`} />
                            <DetailRow label="Appointment amount" value={formatCurrency(entry.raw.grossAmount)} valueClassName="text-success" />
                            <DetailRow label="Commission" value={`-${formatCurrency(entry.raw.commissionAmount).replace('-', '')}`} valueClassName="text-danger" />
                            <DetailRow label="Net received" value={formatCurrency(entry.raw.netAmount)} valueClassName="text-success" strong />
                          </>
                        ) : (
                          <>
                            <DetailRow label="Time" value={formatDateTime(entry.raw.createdAt)} />
                            <DetailRow label="Settlement" value={entry.raw.settlementNumber || entry.raw.settlementId || '-'} />
                            <DetailRow label="PayPal" value={entry.raw.paypalEmail || '-'} />
                            <DetailRow label="Amount" value={`-${formatCurrency(entry.raw.netAmount).replace('-', '')}`} valueClassName="text-danger" />
                            <DetailRow label="Status" value={formatStatus(entry.raw.status)} strong />
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ========== WITHDRAWAL MODAL ========== */}
      {isWithdrawModalOpen && (
        <>
          {/* Overlay */}
          <div
            aria-modal="true"
            className="position-fixed top-0 start-0 w-100 h-100"
            onClick={() => setIsWithdrawModalOpen(false)}
            role="dialog"
            style={{
              zIndex: 1050,
              background: 'rgba(15, 23, 42, 0.55)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              animation: 'fadeIn 0.15s ease-out',
            }}
          />

          {/* Modal card */}
          <div
            className="position-fixed top-50 start-50 translate-middle w-100 mx-auto"
            onClick={(event) => event.stopPropagation()}
            style={{
              zIndex: 1051,
              maxWidth: '450px',
              padding: '0 1rem',
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            <section
              className="bg-white shadow-lg overflow-hidden"
              style={{
                borderRadius: '1.25rem',
                border: '1px solid var(--border)',
                boxShadow: '0 25px 50px -12px rgba(0, 82, 204, 0.15), 0 0 0 1px rgba(0, 82, 204, 0.05)',
              }}
            >
              {/* ===== Top accent bar =====
              <div
                style={{
                  height: '4px',
                  background: 'linear-gradient(90deg, var(--primary) 0%, var(--primary-hover) 60%, #2563eb 100%)',
                }}
              /> */}

              {/* ===== Modal Header ===== */}
              <div className="px-4 pt-4 pb-0 pb-4" style={{ background: 'var(--primary-active)' }}>
                <div className="d-flex align-items-start justify-content-between">
                  <div className="d-flex align-items-center gap-3">
                    {/* Icon with soft gradient */}
                    <span
                      className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                      style={{
                        width: '2.75rem',
                        height: '2.75rem',
                        background: 'linear-gradient(135deg, var(--primary-light) 0%, var(--primary-subtle) 100%)',
                        color: 'var(--primary)',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '1.375rem' }}>payments</span>
                    </span>
                    <div>
                      <h5
                        className="fw-bold mb-0"
                        style={{ color: 'var(--primary-light)', fontSize: '1.125rem', letterSpacing: '-0.01em' }}
                      >
                        Withdraw Funds
                      </h5>
                      <p className="small fw-medium mb-0 mt-1" style={{ color: 'var(--primary-light)', fontSize: '0.75rem' }}>
                        Request a payout to your PayPal account
                      </p>
                    </div>
                  </div>
                  <button
                    className="btn-close btn-close-white"
                    onClick={() => setIsWithdrawModalOpen(false)}
                    type="button"
                    aria-label="Close"
                    style={{
                      opacity: 0.4,
                      transition: 'all 0.15s ease',
                      marginTop: '0.25rem',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.4'; }}
                  />
                </div>
              </div>

              <div className="mx-4" style={{ height: '1px', background: 'var(--border)' }} />

              {/* ===== Modal Body ===== */}
              <form className="px-4 pt-3 pb-4" onSubmit={handleWithdraw}>
                {/* PayPal Email Field */}
                <div className="mb-4">
                  <label
                    className="d-flex align-items-center gap-1 small fw-bold mb-2"
                    style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '0.9375rem' }}>account_balance_wallet</span>
                    PayPal Email
                  </label>

                  <div className="d-flex" style={{ width: '100%' }}>
                    <span
                      className="d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{
                        width: '2.75rem',
                        minHeight: '3rem',
                        background: 'var(--surface-muted)',
                        border: '1px solid var(--border)',
                        borderRight: 'none',
                        borderRadius: '0.75rem 0 0 0.75rem',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>email</span>
                    </span>
                    <input
                      className="form-control shadow-none"
                      onChange={(event) => setPaypalEmail(event.target.value)}
                      placeholder="doctor@example.com"
                      type="email"
                      value={paypalEmail}
                      style={{
                        flex: '1 1 0',
                        minWidth: 0,
                        background: 'var(--surface-muted)',
                        border: '1px solid var(--border)',
                        borderRadius: '0 0.75rem 0.75rem 0',
                        margin: 0,
                        maxWidth: 'none',
                        fontSize: '0.9375rem',
                        paddingTop: '0.625rem',
                        paddingBottom: '0.625rem',
                        paddingLeft: '0.875rem',
                        paddingRight: '0.75rem',
                        color: 'var(--text-primary)',
                        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--primary-border)';
                        e.currentTarget.style.boxShadow = '0 0 0 3px var(--focus-ring)';
                        e.currentTarget.style.background = '#fff';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border)';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.background = 'var(--surface-muted)';
                      }}
                    />
                  </div>
                  <p className="small mt-2" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    <span
                      className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0 me-1"
                      style={{
                        width: '1rem',
                        height: '1rem',
                        background: 'var(--surface-muted)',
                        fontSize: '0.625rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '0.625rem' }}>info</span>
                    </span>
                    Must match the PayPal email in your <span className="fw-semibold" style={{ color: 'var(--text-primary)' }}>profile settings</span>.
                  </p>
                </div>

                {/* Amount Field */}
                <div className="mb-4">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <label
                      className="d-flex align-items-center gap-1 small fw-bold mb-0"
                      style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}
                      htmlFor="doctor-withdraw-amount"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '0.9375rem' }}>attach_money</span>
                      Withdrawal Amount
                    </label>
                    <span
                      className="small fw-semibold d-inline-flex align-items-center gap-1"
                      style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '0.8125rem', color: 'var(--primary)' }}>account_balance_wallet</span>
                      Available:{' '}
                      <span className="fw-bold" style={{ color: 'var(--primary)' }}>{formatCurrency(availableBalance)}</span>
                    </span>
                  </div>

                  <div className="d-flex">
                    <span
                      className="d-flex align-items-center justify-content-center flex-shrink-0 fw-bold"
                      style={{
                        width: '2.75rem',
                        minHeight: '3rem',
                        background: 'var(--surface-muted)',
                        border: '1px solid var(--border)',
                        borderRight: 'none',
                        borderRadius: '0.75rem 0 0 0.75rem',
                        fontSize: '1rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      $
                    </span>
                    <input
                      className="form-control shadow-none fw-bold"
                      id="doctor-withdraw-amount"
                      min="0"
                      onChange={(event) => setWithdrawAmount(event.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      type="number"
                      value={withdrawAmount}
                      style={{
                        flex: '1 1 0',
                        minWidth: 0,
                        background: 'var(--surface-muted)',
                        border: '1px solid var(--border)',
                        borderRadius: '0 0.75rem 0.75rem 0',
                        fontSize: '1.375rem',
                        margin: 0,
                        maxWidth: 'none',
                        paddingTop: '0.625rem',
                        paddingBottom: '0.625rem',
                        paddingLeft: '0.875rem',
                        paddingRight: '0.75rem',
                        letterSpacing: '-0.02em',
                        color: 'var(--text-primary)',
                        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--primary-border)';
                        e.currentTarget.style.boxShadow = '0 0 0 3px var(--focus-ring)';
                        e.currentTarget.style.background = '#fff';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border)';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.background = 'var(--surface-muted)';
                      }}
                    />
                  </div>

                  {/* Amount hint */}
                  <div
                    className="d-flex align-items-center gap-1 mt-2"
                    style={{
                      fontSize: '0.75rem',
                      color: requestedAmount <= 0
                        ? 'var(--text-muted)'
                        : remainingAfterWithdrawal > 10
                          ? 'var(--success)'
                          : 'var(--error)',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '0.8125rem' }}>
                      {requestedAmount <= 0
                        ? 'info'
                        : remainingAfterWithdrawal > 10
                          ? 'check_circle'
                          : 'error'
                      }
                    </span>
                    <span className="fw-medium">
                      {requestedAmount <= 0
                        ? 'Enter an amount to withdraw'
                        : remainingAfterWithdrawal > 10
                          ? <>You will keep <span className="fw-bold">{formatCurrency(remainingAfterWithdrawal)}</span> in your account</>
                          : 'Remaining balance must be greater than $10.00'
                      }
                    </span>
                  </div>
                </div>

                {/* ===== Summary Card ===== */}
                <div
                  className="rounded-4 p-3 mb-4 border"
                  style={{
                    background: 'linear-gradient(135deg, var(--primary-subtle) 0%, var(--surface) 100%)',
                    borderColor: 'var(--primary-border)',
                  }}
                >
                  <p
                    className="text-uppercase small fw-bold mb-3 d-flex align-items-center gap-1"
                    style={{ color: 'var(--text-muted)', fontSize: '0.6875rem', letterSpacing: '0.05em' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '0.8125rem' }}>receipt</span>
                    Withdrawal Summary
                  </p>

                  <DetailRow label="Withdrawal Amount" value={formatCurrency(requestedAmount)} />
                  <DetailRow label="Transaction Fee" value={formatCurrency(0)} valueClassName="text-success" />

                  <div className="my-2" style={{ height: '1px', background: 'var(--border)' }} />

                  <div className="d-flex justify-content-between align-items-center gap-3 py-1">
                    <span className="small fw-bold" style={{ color: 'var(--text-secondary)' }}>You will receive</span>
                    <span
                      className="fw-bold"
                      style={{
                        color: 'var(--primary)',
                        fontSize: '1.125rem',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {formatCurrency(requestedAmount)}
                    </span>
                  </div>
                </div>

                {/* ===== Action Buttons ===== */}
                <div className="d-flex align-items-center gap-3">
                  <button
                    className="btn fw-semibold py-2 px-4 flex-shrink-0"
                    onClick={() => setIsWithdrawModalOpen(false)}
                    type="button"
                    style={{
                      borderRadius: '0.75rem',
                      fontSize: '0.875rem',
                      color: 'var(--text-secondary)',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--surface-muted)';
                      e.currentTarget.style.borderColor = 'var(--text-muted)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--surface)';
                      e.currentTarget.style.borderColor = 'var(--border)';
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    className="btn fw-semibold py-2 d-inline-flex align-items-center justify-content-center gap-2 border-0 w-100"
                    disabled={!canWithdraw}
                    type="submit"
                    style={{
                      borderRadius: '0.75rem',
                      fontSize: '0.875rem',
                      background: !canWithdraw
                        ? 'var(--surface-muted)'
                        : 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
                      boxShadow: !canWithdraw
                        ? 'none'
                        : '0 4px 10px -2px rgba(0, 82, 204, 0.25)',
                      color: !canWithdraw ? 'var(--text-muted)' : '#fff',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                    onMouseEnter={(e) => {
                      if (canWithdraw && !withdrawing) {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 10px 20px -4px rgba(0, 82, 204, 0.35)';
                        e.currentTarget.style.background = 'linear-gradient(135deg, var(--primary-hover) 0%, var(--primary-active) 100%)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (canWithdraw && !withdrawing) {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = '0 4px 10px -2px rgba(0, 82, 204, 0.25)';
                        e.currentTarget.style.background = 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)';
                      }
                    }}
                  >
                    {withdrawing ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>verified</span>
                        Confirm Withdrawal
                      </>
                    )}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function DetailRow({ label, value, valueClassName, strong = false }) {
  const ValueTag = strong ? 'strong' : 'span';

  return (
    <div className="d-flex justify-content-between align-items-center gap-3 py-1">
      <span className="small" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <ValueTag
        className={`small fw-semibold text-end ${valueClassName || ''}`}
        style={{ color: strong ? 'var(--text-primary)' : undefined }}
      >
        {value}
      </ValueTag>
    </div>
  );
}
