import React, { useEffect, useMemo, useState, memo } from 'react';
import { toast } from 'sonner';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { paymentApi } from '../../api/paymentApi';

const DateInput = React.forwardRef(({ value, onClick, placeholder }, ref) => (
  <input
    ref={ref}
    value={value}
    onClick={onClick}
    placeholder={placeholder}
    readOnly
    className="pharmacy-wallet-date-input"
  />
));

const WalletDatePicker = memo(({ selected, onChange, placeholderText }) => (
  <DatePicker
    selected={selected}
    onChange={onChange}
    dateFormat="MMM d, yyyy"
    placeholderText={placeholderText}
    isClearable
    popperPlacement="bottom-start"
    calendarClassName="wallet-datepicker-popper"
    customInput={<DateInput />}
  />
));

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

const getBadgeClass = (status) => {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'SETTLED') return 'settled';
  if (['PAID', 'COMPLETED'].includes(normalized)) return 'completed';
  if (['PROCESSING', 'PENDING'].includes(normalized)) return 'pending';
  if (['FAILED', 'REFUNDED', 'CANCELLED'].includes(normalized)) return 'failed';
  return 'completed';
};

export default function PharmacyWalletTab({ profile, balance, transactions, settlements, pharmacyId, reload, loading }) {
  const [expandedEntryId, setExpandedEntryId] = useState(null);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [paypalEmail, setPaypalEmail] = useState(profile?.paypalEmail || '');
  const [withdrawing, setWithdrawing] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

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

  const pendingBalance = Number(balance?.pendingBalance ?? profile?.pendingSettlement ?? 0);
  const requestedAmount = Number(withdrawAmount || 0);
  const remainingAfterWithdrawal = pendingBalance - requestedAmount;
  const canWithdraw =
    requestedAmount > 0 &&
    remainingAfterWithdrawal > 10 &&
    paypalEmail.trim().length > 0 &&
    !withdrawing;
  const eligibleForWithdrawal = Boolean(balance?.eligibleForWithdrawal ?? pendingBalance > 10);
  const withdrawalStatus = balance?.withdrawalStatus || (eligibleForWithdrawal ? 'Wallet is ready.' : 'Minimum balance is $10.00.');

  const history = useMemo(() => {
    const earningEntries = transactions.map((item, index) => {
      const isAppointment = item.sourceType === 'APPOINTMENT';
      const refId = isAppointment ? item.appointmentId : item.pharmacyOrderId;
      return {
        kind: 'earning',
        id: `earning-${item.transactionId ?? item.transactionNumber ?? index}`,
        title: isAppointment
          ? `Appointment #${refId || '-'}`
          : `Order #${refId || '-'}`,
        amount: item.netAmount,
        status: item.status,
        createdAt: item.createdAt,
        raw: item,
      };
    });

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

  const filtered = useMemo(() => {
    let result = [...history];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((entry) =>
        entry.title.toLowerCase().includes(term) ||
        (entry.raw.appointmentId?.toString() || '').includes(term) ||
        (entry.raw.pharmacyOrderId?.toString() || '').includes(term) ||
        (entry.raw.settlementNumber?.toLowerCase() || '').includes(term)
      );
    }

    if (dateFrom) {
      result = result.filter((entry) => new Date(entry.createdAt) >= dateFrom);
    }
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      result = result.filter((entry) => new Date(entry.createdAt) <= end);
    }

    if (typeFilter && typeFilter !== 'all') {
      result = result.filter((entry) => entry.kind === typeFilter);
    }

    if (statusFilter && statusFilter !== 'all') {
      result = result.filter((entry) => {
        const status = (entry.status || '').toUpperCase();
        if (statusFilter === 'completed') return ['PAID', 'COMPLETED', 'SETTLED'].includes(status);
        if (statusFilter === 'pending') return ['PROCESSING', 'PENDING'].includes(status);
        if (statusFilter === 'failed') return ['FAILED', 'REFUNDED', 'CANCELLED'].includes(status);
        return true;
      });
    }

    return result;
  }, [history, searchTerm, dateFrom, dateTo, typeFilter, statusFilter]);

  useEffect(() => { setPage(1); }, [searchTerm, dateFrom, dateTo, typeFilter, statusFilter]);

  const handleWithdraw = async (event) => {
    event.preventDefault();
    if (!canWithdraw) return;

    setWithdrawing(true);
    try {
      await paymentApi.requestPartnerSettlement(
        pharmacyId,
        {
          amount: requestedAmount,
          paypalEmail: paypalEmail.trim(),
          notes: 'Pharmacy wallet withdrawal request',
        },
        'PHARMACY'
      );
      toast.success('Withdrawal request submitted.');
      setWithdrawAmount('');
      setIsWithdrawModalOpen(false);
      await reload?.();
    } catch (error) {
      console.error('Withdrawal failed', error);
      toast.error(error.response?.data?.message || 'Unable to submit withdrawal.');
    } finally {
      setWithdrawing(false);
    }
  };

  const calendarStyle = useMemo(() => (
    <style>{`
      .react-datepicker-popper[data-placement] {
        z-index: 1060 !important;
      }
      .wallet-datepicker-popper.react-datepicker {
        font-family: inherit;
        border-color: var(--pharmacy-border);
        border-radius: 0.75rem;
        background: var(--pharmacy-card);
        box-shadow: 0 8px 32px rgba(0,0,0,0.12);
        transition: opacity 0.15s ease;
      }
      .wallet-datepicker-popper .react-datepicker__header {
        background: var(--pharmacy-subtle);
        border-bottom-color: var(--pharmacy-border);
        padding: 10px 0 6px;
      }
      .wallet-datepicker-popper .react-datepicker__current-month,
      .wallet-datepicker-popper .react-datepicker__day-name {
        color: var(--pharmacy-text);
        font-weight: 600;
        letter-spacing: 0.01em;
      }
      .wallet-datepicker-popper .react-datepicker__day {
        color: var(--pharmacy-text);
        border-radius: 6px;
        transition: background 0.12s ease, color 0.12s ease;
        line-height: 1.8;
      }
      .wallet-datepicker-popper .react-datepicker__day:hover {
        background: var(--pharmacy-primary);
        color: #fff;
      }
      .wallet-datepicker-popper .react-datepicker__day--selected,
      .wallet-datepicker-popper .react-datepicker__day--keyboard-selected {
        background: var(--pharmacy-primary);
        color: #fff;
        font-weight: 600;
      }
      .wallet-datepicker-popper .react-datepicker__day--today {
        font-weight: 700;
        position: relative;
      }
      .wallet-datepicker-popper .react-datepicker__day--today:not(.react-datepicker__day--selected):not(.react-datepicker__day--keyboard-selected) {
        background: rgba(0, 60, 144, 0.08);
        color: var(--pharmacy-primary);
      }
      .wallet-datepicker-popper .react-datepicker__day--outside-month {
        color: var(--pharmacy-muted);
      }
      .wallet-datepicker-popper .react-datepicker__day--disabled {
        color: var(--pharmacy-border) !important;
        cursor: not-allowed;
      }
      .wallet-datepicker-popper .react-datepicker__navigation-icon::before {
        border-color: var(--pharmacy-muted);
        transition: border-color 0.15s ease;
      }
      .wallet-datepicker-popper .react-datepicker__navigation:hover .react-datepicker__navigation-icon::before {
        border-color: var(--pharmacy-primary);
      }
      .wallet-datepicker-popper .react-datepicker__close-icon::after {
        background: var(--pharmacy-muted);
        transition: background 0.15s ease;
      }
      .wallet-datepicker-popper .react-datepicker__close-icon:hover::after {
        background: var(--pharmacy-muted);
      }
      .wallet-datepicker-popper .react-datepicker__day:focus-visible {
        outline: 2px solid var(--pharmacy-primary);
        outline-offset: 2px;
      }
    `}</style>
  ), []);

  if (loading && !balance) {
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
      {calendarStyle}

      {/* ========== WALLET HERO ========== */}
      <section
        className="card border-0 overflow-hidden shadow-sm"
        style={{ borderRadius: '1.25rem', background: 'var(--pharmacy-card)' }}
      >
        <div className="card-body p-0">
          <div
            className="p-4 p-md-5 text-white position-relative"
            style={{
              background: 'linear-gradient(135deg, #0a2647 0%, var(--pharmacy-primary) 35%, #002a6e 70%, #001d4f 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
            }}
          >
            {/* Decorative glow orbs */}
            <div
              className="position-absolute rounded-circle"
              style={{
                width: '18rem',
                height: '18rem',
                background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 65%)',
                top: '-8rem',
                right: '-4rem',
                pointerEvents: 'none',
              }}
            />
            <div
              className="position-absolute rounded-circle"
              style={{
                width: '10rem',
                height: '10rem',
                background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 65%)',
                bottom: '-3rem',
                right: '8rem',
                pointerEvents: 'none',
              }}
            />
            <div
              className="position-absolute rounded-circle"
              style={{
                width: '5rem',
                height: '5rem',
                background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 65%)',
                top: '1.5rem',
                left: '25%',
                pointerEvents: 'none',
              }}
            />

            <div className="d-flex flex-column gap-4 flex-md-row align-items-md-end justify-content-md-between position-relative">
              <div>
                <div
                  className="d-inline-flex align-items-center px-2 py-1 rounded-3 mb-3"
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.08)', gap: '0.375rem' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '0.8125rem', opacity: 0.8 }}>account_balance_wallet</span>
                  <span className="text-uppercase small fw-semibold" style={{ letterSpacing: '0.05em', fontSize: '0.6875rem', opacity: 0.85 }}>
                    Available Balance
                  </span>
                </div>

                <h2
                  className="fw-bold mb-0"
                  style={{
                    fontSize: 'clamp(2.25rem, 4.5vw, 3rem)',
                    letterSpacing: '-0.03em',
                    lineHeight: 1.05,
                    textShadow: '0 2px 16px rgba(0,0,0,0.2)',
                  }}
                >
                  {formatCurrency(pendingBalance)}
                </h2>

                <div className="d-flex align-items-center gap-2 mt-3">
                  <span
                    className="d-inline-block rounded-circle flex-shrink-0"
                    style={{
                      width: '0.5rem',
                      height: '0.5rem',
                      background: eligibleForWithdrawal ? 'var(--pharmacy-success)' : 'var(--pharmacy-warning)',
                      boxShadow: eligibleForWithdrawal
                        ? '0 0 0 3px rgba(16, 185, 129, 0.35)'
                        : '0 0 0 3px rgba(217, 119, 6, 0.35)',
                      animation: eligibleForWithdrawal ? 'pulse-dot 2s ease-in-out infinite' : 'none',
                    }}
                  />
                  <div
                    className="d-inline-flex align-items-center px-2 py-1 rounded-2"
                    style={{ background: 'rgba(255,255,255,0.08)' }}
                  >
                    <span className="small fw-semibold" style={{ fontSize: '0.8125rem', opacity: 0.9 }}>
                      {eligibleForWithdrawal ? 'Withdrawals Ready' : 'On Hold'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                className="btn fw-bold d-inline-flex align-items-center justify-content-center gap-2 px-4 py-2 border-0"
                disabled={!pharmacyId || !eligibleForWithdrawal}
                onClick={() => setIsWithdrawModalOpen(true)}
                type="button"
                style={{
                  borderRadius: '0.75rem',
                  fontSize: '0.875rem',
                  background: eligibleForWithdrawal
                    ? 'linear-gradient(135deg, #ffffff 0%, #f0f4ff 100%)'
                    : 'rgba(255,255,255,0.1)',
                  color: eligibleForWithdrawal ? 'var(--pharmacy-primary)' : 'rgba(255,255,255,0.35)',
                  boxShadow: eligibleForWithdrawal
                    ? '0 4px 16px -2px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.9)'
                    : 'none',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  cursor: eligibleForWithdrawal ? 'pointer' : 'not-allowed',
                  transform: 'translateY(0)',
                  paddingTop: '0.625rem',
                  paddingBottom: '0.625rem',
                  minWidth: '180px',
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #ffffff 0%, #e8efff 100%)';
                    e.currentTarget.style.boxShadow = '0 8px 28px -4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.95)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #ffffff 0%, #f0f4ff 100%)';
                    e.currentTarget.style.boxShadow = '0 4px 16px -2px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.9)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
                onMouseDown={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.transform = 'scale(0.97)';
                  }
                }}
                onMouseUp={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>payments</span>
                Withdraw via PayPal
              </button>
            </div>

            {/* Liquid Glass refraction border */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12) 20%, rgba(255,255,255,0.12) 80%, transparent)',
              }}
            />
          </div>
        </div>
      </section>

      {/* ========== TRANSACTIONS ========== */}
      <section className="pharmacy-tx-section pharmacy-tx-card-shadow">
        {/* Filters */}
        <div className="pharmacy-tx-filters">
          <div className="pharmacy-tx-filters-grid">
            <div className="pharmacy-tx-filter-col pharmacy-tx-filter-col--search">
              <label className="pharmacy-tx-filter-label">Search</label>
              <div className="pharmacy-tx-filter-group">
                <span className="pharmacy-tx-filter-group-icon">
                  <span className="material-symbols-outlined">search</span>
                </span>
                <input
                  className="pharmacy-tx-filter-input"
                  placeholder="Appointment ID, Settlement..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="pharmacy-tx-filter-col pharmacy-tx-filter-col--date">
              <label className="pharmacy-tx-filter-label">From</label>
              <WalletDatePicker
                selected={dateFrom}
                onChange={(date) => setDateFrom(date)}
                placeholderText="From date"
              />
            </div>
            <div className="pharmacy-tx-filter-col pharmacy-tx-filter-col--date">
              <label className="pharmacy-tx-filter-label">To</label>
              <WalletDatePicker
                selected={dateTo}
                onChange={(date) => setDateTo(date)}
                placeholderText="To date"
              />
            </div>
            <div className="pharmacy-tx-filter-col pharmacy-tx-filter-col--select">
              <label className="pharmacy-tx-filter-label">Type</label>
              <div className="pharmacy-tx-filter-select-wrap">
                <select
                  className="pharmacy-tx-filter-select"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="earning">Earnings</option>
                  <option value="withdrawal">Withdrawals</option>
                </select>
                <span className="pharmacy-tx-filter-select-icon">
                  <span className="material-symbols-outlined">expand_more</span>
                </span>
              </div>
            </div>
            <div className="pharmacy-tx-filter-col pharmacy-tx-filter-col--select">
              <label className="pharmacy-tx-filter-label">Status</label>
              <div className="pharmacy-tx-filter-select-wrap">
                <select
                  className="pharmacy-tx-filter-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Processing/Pending</option>
                  <option value="failed">Failed/Cancelled</option>
                </select>
                <span className="pharmacy-tx-filter-select-icon">
                  <span className="material-symbols-outlined">expand_more</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="pharmacy-tx-header">
          <div className="pharmacy-tx-header-left">
            <div className="pharmacy-tx-header-icon">
              <span className="material-symbols-outlined">receipt_long</span>
            </div>
            <div>
              <h3 className="pharmacy-tx-header-title">Recent Transactions</h3>
              <p className="pharmacy-tx-header-subtitle" style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--pharmacy-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <span style={{
                  width: '0.375rem',
                  height: '0.375rem',
                  borderRadius: '50%',
                  display: 'inline-block',
                  flexShrink: 0,
                  background: eligibleForWithdrawal ? 'var(--pharmacy-success)' : 'var(--pharmacy-warning)',
                }} />
                {withdrawalStatus}
              </p>
            </div>
          </div>
          <button
            className="pharmacy-tx-header-refresh"
            disabled={loading}
            onClick={reload}
            type="button"
          >
            {loading
              ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
              : <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>refresh</span>
            }
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {/* Transaction list */}
        {(() => {
          const displayData = filtered;
          const totalItems = displayData.length;
          const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
          const pagedData = displayData.slice((page - 1) * pageSize, page * pageSize);
          const startItem = totalItems > 0 ? (page - 1) * pageSize + 1 : 0;
          const endItem = Math.min(page * pageSize, totalItems);

          const getPageNumbers = () => {
            const pages = [];
            const maxVisible = 5;
            if (totalPages <= maxVisible) {
              for (let i = 1; i <= totalPages; i++) pages.push(i);
            } else {
              pages.push(1);
              let start = Math.max(2, page - 1);
              let end = Math.min(totalPages - 1, page + 1);
              if (page <= 2) { start = 2; end = Math.min(4, totalPages - 1); }
              if (page >= totalPages - 1) { start = Math.max(2, totalPages - 3); end = totalPages - 1; }
              if (start > 2) pages.push('...');
              for (let i = start; i <= end; i++) pages.push(i);
              if (end < totalPages - 1) pages.push('...');
              pages.push(totalPages);
            }
            return pages;
          };

          if (loading && totalItems === 0) {
            return (
              <div className="pharmacy-tx-empty">
                <div className="spinner-border mb-3" role="status" style={{ width: '2.5rem', height: '2.5rem', color: 'var(--pharmacy-primary)' }}>
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="pharmacy-tx-empty-title">Loading wallet...</p>
              </div>
            );
          }

          if (totalItems === 0) {
            return (
              <div className="pharmacy-tx-empty">
                <div className="pharmacy-tx-empty-icon">
                  <span className="material-symbols-outlined">{searchTerm ? 'search_off' : 'receipt_long'}</span>
                </div>
                <p className="pharmacy-tx-empty-title">
                  {searchTerm ? 'No matching transactions found.' : 'No wallet transactions yet.'}
                </p>
                <p className="pharmacy-tx-empty-desc">
                  {searchTerm ? 'Try adjusting your filters.' : 'Your appointment earnings will appear here.'}
                </p>
              </div>
            );
          }

          return (
            <>
              <div className="pharmacy-tx-list">
                {pagedData.map((entry) => {
                  const isExpanded = expandedEntryId === entry.id;
                  const isPositive = Number(entry.amount) >= 0;
                  const entryKind = entry.kind;

                  return (
                    <div key={entry.id} className="pharmacy-tx-item">
                      <div className={`pharmacy-tx-item-strip pharmacy-tx-item-strip--${isPositive ? 'positive' : 'negative'}`} />

                      <div
                        className="pharmacy-tx-item-main"
                        onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                      >
                        <div className="pharmacy-tx-item-left">
                          <div className={`pharmacy-tx-item-icon pharmacy-tx-item-icon--${entryKind}`}>
                            <span className="material-symbols-outlined">
                              {entryKind === 'earning'
                                ? (entry.raw.sourceType === 'PHARMACY_ORDER' ? 'shopping_cart' : 'videocam')
                                : 'account_balance'
                              }
                            </span>
                          </div>
                          <div className="pharmacy-tx-item-info">
                            <span className="pharmacy-tx-item-title">{entry.title}</span>
                            <span className="pharmacy-tx-item-date">{formatDateTime(entry.createdAt)}</span>
                          </div>
                        </div>

                        <div className="pharmacy-tx-item-right">
                          <div className="pharmacy-tx-item-amount-group">
                            <span className={`pharmacy-tx-item-amount ${isPositive ? 'pharmacy-tx-item-amount--positive' : 'pharmacy-tx-item-amount--negative'}`}>
                              {isPositive ? '+' : ''}{formatCurrency(entry.amount)}
                            </span>
                            <span className={`pharmacy-tx-item-badge pharmacy-tx-item-badge--${getBadgeClass(entry.status)}`}>
                              {formatStatus(entry.status)}
                            </span>
                          </div>
                          <button
                            className="pharmacy-tx-item-expand"
                            onClick={(e) => { e.stopPropagation(); setExpandedEntryId(isExpanded ? null : entry.id); }}
                            type="button"
                          >
                            <span className={`material-symbols-outlined ${isExpanded ? 'rotated' : ''}`}>expand_more</span>
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="pharmacy-tx-details">
                          <div className="pharmacy-tx-details-inner">
                            <div className="pharmacy-tx-details-grid">
                              {entryKind === 'earning' ? (
                                <>
                                  <div className="pharmacy-tx-details-item">
                                    <span className="pharmacy-tx-details-label">Time</span>
                                    <span className="pharmacy-tx-details-value">{formatDateTime(entry.raw.createdAt)}</span>
                                  </div>
                                  <div className="pharmacy-tx-details-item pharmacy-tx-details-item--right">
                                    <span className="pharmacy-tx-details-label">Gross Amount</span>
                                    <span className="pharmacy-tx-details-value pharmacy-tx-details-value--positive">{formatCurrency(entry.raw.grossAmount)}</span>
                                  </div>
                                  {entry.raw.sourceType === 'APPOINTMENT' ? (
                                    <>
                                      <div className="pharmacy-tx-details-item">
                                        <span className="pharmacy-tx-details-label">Appointment</span>
                                        <span className="pharmacy-tx-details-value">#{entry.raw.appointmentId || '-'}</span>
                                      </div>
                                      <div className="pharmacy-tx-details-item pharmacy-tx-details-item--right">
                                        <span className="pharmacy-tx-details-label">Commission</span>
                                        <span className="pharmacy-tx-details-value pharmacy-tx-details-value--negative">-{formatCurrency(entry.raw.commissionAmount).replace('-', '')}</span>
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="pharmacy-tx-details-item">
                                        <span className="pharmacy-tx-details-label">Order</span>
                                        <span className="pharmacy-tx-details-value">#{entry.raw.pharmacyOrderId || '-'}</span>
                                      </div>
                                      <div className="pharmacy-tx-details-item pharmacy-tx-details-item--right">
                                        <span className="pharmacy-tx-details-label">Commission</span>
                                        <span className="pharmacy-tx-details-value pharmacy-tx-details-value--negative">-{formatCurrency(entry.raw.commissionAmount).replace('-', '')}</span>
                                      </div>
                                    </>
                                  )}
                                  <div className="pharmacy-tx-details-item">
                                    <span className="pharmacy-tx-details-label">Status</span>
                                    <span className="pharmacy-tx-details-value">{formatStatus(entry.raw.status)}</span>
                                  </div>
                                  <div className="pharmacy-tx-details-item pharmacy-tx-details-item--right">
                                    <span className="pharmacy-tx-details-label">Net Received</span>
                                    <span className="pharmacy-tx-details-value pharmacy-tx-details-value--positive">{formatCurrency(entry.raw.netAmount)}</span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="pharmacy-tx-details-item">
                                    <span className="pharmacy-tx-details-label">Time</span>
                                    <span className="pharmacy-tx-details-value">{formatDateTime(entry.raw.createdAt)}</span>
                                  </div>
                                  <div className="pharmacy-tx-details-item pharmacy-tx-details-item--right">
                                    <span className="pharmacy-tx-details-label">Settlement</span>
                                    <span className="pharmacy-tx-details-value">{entry.raw.settlementNumber || entry.raw.settlementId || '-'}</span>
                                  </div>
                                  <div className="pharmacy-tx-details-item">
                                    <span className="pharmacy-tx-details-label">PayPal</span>
                                    <span className="pharmacy-tx-details-value">{entry.raw.paypalEmail || '-'}</span>
                                  </div>
                                  <div className="pharmacy-tx-details-item pharmacy-tx-details-item--right">
                                    <span className="pharmacy-tx-details-label">Amount</span>
                                    <span className="pharmacy-tx-details-value pharmacy-tx-details-value--negative">-{formatCurrency(entry.raw.netAmount).replace('-', '')}</span>
                                  </div>
                                  <div className="pharmacy-tx-details-item">
                                    <span className="pharmacy-tx-details-label">Status</span>
                                    <span className="pharmacy-tx-details-value">{formatStatus(entry.raw.status)}</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              <div className="pharmacy-tx-pagination">
                <span className="pharmacy-tx-pagination-info">
                  Showing {startItem} to {endItem} of {totalItems} entries
                </span>
                <div className="pharmacy-tx-pagination-buttons">
                  <button
                    className="pharmacy-tx-pagination-btn"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    type="button"
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  {getPageNumbers().map((p, i) =>
                    p === '...' ? (
                      <span key={`e${i}`} className="pharmacy-tx-pagination-ellipsis">...</span>
                    ) : (
                      <button
                        key={p}
                        className={`pharmacy-tx-pagination-btn ${p === page ? 'pharmacy-tx-pagination-btn--active' : ''}`}
                        onClick={() => setPage(p)}
                        type="button"
                      >
                        {p}
                      </button>
                    )
                  )}
                  <button
                    className="pharmacy-tx-pagination-btn"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    type="button"
                  >
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
              </div>
            </>
          );
        })()}
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
                border: '1px solid var(--pharmacy-border)',
                boxShadow: '0 25px 50px -12px rgba(0, 60, 144, 0.15), 0 0 0 1px rgba(0, 60, 144, 0.05)',
              }}
            >
              {/* ===== Modal Header ===== */}
              <div className="px-4 pt-4 pb-0 pb-4" style={{ background: '#001d4f' }}>
                <div className="d-flex align-items-start justify-content-between">
                  <div className="d-flex align-items-center gap-3">
                    <span
                      className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                      style={{
                        width: '2.75rem',
                        height: '2.75rem',
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)',
                        color: 'rgba(255,255,255,0.9)',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '1.375rem' }}>payments</span>
                    </span>
                    <div>
                      <h5
                        className="fw-bold mb-0"
                        style={{ color: '#fff', fontSize: '1.125rem', letterSpacing: '-0.01em' }}
                      >
                        Withdraw Funds
                      </h5>
                      <p className="small fw-medium mb-0 mt-1" style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem' }}>
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

              <div className="mx-4" style={{ height: '1px', background: 'var(--pharmacy-border)' }} />

              {/* ===== Modal Body ===== */}
              <form className="px-4 pt-3 pb-4" onSubmit={handleWithdraw}>
                {/* PayPal Email Field */}
                <div className="mb-4">
                  <label
                    className="d-flex align-items-center gap-1 small fw-bold mb-2"
                    style={{ color: 'var(--pharmacy-muted)', fontSize: '0.8125rem' }}
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
                        background: 'var(--pharmacy-subtle)',
                        border: '1px solid var(--pharmacy-border)',
                        borderRight: 'none',
                        borderRadius: '0.75rem 0 0 0.75rem',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--pharmacy-muted)' }}>email</span>
                    </span>
                    <input
                      className="form-control shadow-none"
                      onChange={(event) => setPaypalEmail(event.target.value)}
                      placeholder="pharmacy@example.com"
                      type="email"
                      value={paypalEmail}
                      style={{
                        flex: '1 1 0',
                        minWidth: 0,
                        background: 'var(--pharmacy-subtle)',
                        border: '1px solid var(--pharmacy-border)',
                        borderRadius: '0 0.75rem 0.75rem 0',
                        margin: 0,
                        maxWidth: 'none',
                        fontSize: '0.9375rem',
                        paddingTop: '0.625rem',
                        paddingBottom: '0.625rem',
                        paddingLeft: '0.875rem',
                        paddingRight: '0.75rem',
                        color: 'var(--pharmacy-text)',
                        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--pharmacy-primary)';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 60, 144, 0.15)';
                        e.currentTarget.style.background = '#fff';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--pharmacy-border)';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.background = 'var(--pharmacy-subtle)';
                      }}
                    />
                  </div>
                  <p className="small mt-2" style={{ color: 'var(--pharmacy-muted)', fontSize: '0.75rem' }}>
                    <span
                      className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0 me-1"
                      style={{
                        width: '1rem',
                        height: '1rem',
                        background: 'var(--pharmacy-subtle)',
                        fontSize: '0.625rem',
                        color: 'var(--pharmacy-muted)',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '0.625rem' }}>info</span>
                    </span>
                    Must match the PayPal email in your <span className="fw-semibold" style={{ color: 'var(--pharmacy-text)' }}>profile settings</span>.
                  </p>
                </div>

                {/* Amount Field */}
                <div className="mb-4">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <label
                      className="d-flex align-items-center gap-1 small fw-bold mb-0"
                      style={{ color: 'var(--pharmacy-muted)', fontSize: '0.8125rem' }}
                      htmlFor="pharmacy-withdraw-amount"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '0.9375rem' }}>attach_money</span>
                      Withdrawal Amount
                    </label>
                    <span
                      className="small fw-semibold d-inline-flex align-items-center gap-1"
                      style={{ color: 'var(--pharmacy-muted)', fontSize: '0.75rem' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '0.8125rem', color: 'var(--pharmacy-primary)' }}>account_balance_wallet</span>
                      Available:{' '}
                      <span className="fw-bold" style={{ color: 'var(--pharmacy-primary)' }}>{formatCurrency(pendingBalance)}</span>
                    </span>
                  </div>

                  <div className="d-flex">
                    <span
                      className="d-flex align-items-center justify-content-center flex-shrink-0 fw-bold"
                      style={{
                        width: '2.75rem',
                        minHeight: '3rem',
                        background: 'var(--pharmacy-subtle)',
                        border: '1px solid var(--pharmacy-border)',
                        borderRight: 'none',
                        borderRadius: '0.75rem 0 0 0.75rem',
                        fontSize: '1rem',
                        color: 'var(--pharmacy-muted)',
                      }}
                    >
                      $
                    </span>
                    <input
                      className="form-control shadow-none fw-bold"
                      id="pharmacy-withdraw-amount"
                      min="0"
                      onChange={(event) => setWithdrawAmount(event.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      type="number"
                      value={withdrawAmount}
                      style={{
                        flex: '1 1 0',
                        minWidth: 0,
                        background: 'var(--pharmacy-subtle)',
                        border: '1px solid var(--pharmacy-border)',
                        borderRadius: '0 0.75rem 0.75rem 0',
                        fontSize: '1.375rem',
                        margin: 0,
                        maxWidth: 'none',
                        paddingTop: '0.625rem',
                        paddingBottom: '0.625rem',
                        paddingLeft: '0.875rem',
                        paddingRight: '0.75rem',
                        letterSpacing: '-0.02em',
                        color: 'var(--pharmacy-text)',
                        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--pharmacy-primary)';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 60, 144, 0.15)';
                        e.currentTarget.style.background = '#fff';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--pharmacy-border)';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.background = 'var(--pharmacy-subtle)';
                      }}
                    />
                  </div>

                  {/* Amount hint */}
                  <div
                    className="d-flex align-items-center gap-1 mt-2"
                    style={{
                      fontSize: '0.75rem',
                      color: requestedAmount <= 0
                        ? 'var(--pharmacy-muted)'
                        : remainingAfterWithdrawal > 10
                          ? 'var(--pharmacy-success)'
                          : 'var(--pharmacy-danger)',
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
                    background: 'linear-gradient(135deg, rgba(0, 60, 144, 0.06) 0%, var(--pharmacy-card) 100%)',
                    borderColor: 'rgba(0, 60, 144, 0.15)',
                  }}
                >
                  <p
                    className="text-uppercase small fw-bold mb-3 d-flex align-items-center gap-1"
                    style={{ color: 'var(--pharmacy-muted)', fontSize: '0.6875rem', letterSpacing: '0.05em' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '0.8125rem' }}>receipt</span>
                    Withdrawal Summary
                  </p>

                  <DetailRow label="Withdrawal Amount" value={formatCurrency(requestedAmount)} />
                  <DetailRow label="Transaction Fee" value={formatCurrency(0)} valueClassName="text-success" />

                  <div className="my-2" style={{ height: '1px', background: 'var(--pharmacy-border)' }} />

                  <div className="d-flex justify-content-between align-items-center gap-3 py-1">
                    <span className="small fw-bold" style={{ color: 'var(--pharmacy-muted)' }}>You will receive</span>
                    <span
                      className="fw-bold"
                      style={{
                        color: 'var(--pharmacy-primary)',
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
                      color: 'var(--pharmacy-muted)',
                      background: 'var(--pharmacy-card)',
                      border: '1px solid var(--pharmacy-border)',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--pharmacy-subtle)';
                      e.currentTarget.style.borderColor = 'var(--pharmacy-muted)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--pharmacy-card)';
                      e.currentTarget.style.borderColor = 'var(--pharmacy-border)';
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
                        ? 'var(--pharmacy-subtle)'
                        : 'linear-gradient(135deg, var(--pharmacy-primary) 0%, #002a6e 100%)',
                      boxShadow: !canWithdraw
                        ? 'none'
                        : '0 4px 10px -2px rgba(0, 60, 144, 0.25)',
                      color: !canWithdraw ? 'var(--pharmacy-muted)' : '#fff',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                    onMouseEnter={(e) => {
                      if (canWithdraw && !withdrawing) {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 10px 20px -4px rgba(0, 60, 144, 0.35)';
                        e.currentTarget.style.background = 'linear-gradient(135deg, #002a6e 0%, #001d4f 100%)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (canWithdraw && !withdrawing) {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = '0 4px 10px -2px rgba(0, 60, 144, 0.25)';
                        e.currentTarget.style.background = 'linear-gradient(135deg, var(--pharmacy-primary) 0%, #002a6e 100%)';
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
      <span className="small" style={{ color: 'var(--pharmacy-muted)' }}>{label}</span>
      <ValueTag
        className={`small fw-semibold text-end ${valueClassName || ''}`}
        style={{ color: strong ? 'var(--pharmacy-text)' : undefined }}
      >
        {value}
      </ValueTag>
    </div>
  );
}
