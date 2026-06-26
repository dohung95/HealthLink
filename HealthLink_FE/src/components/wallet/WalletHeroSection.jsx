import React, { useMemo } from 'react';
import { formatCurrency } from './WalletHelpers';
import './wallet-shared.css';

export default function WalletHeroSection({
  pendingBalance,
  eligibleForWithdrawal,
  onWithdrawClick,
  disabled,
  theme,
}) {
  const h = theme.hero;
  const c = theme.colors;

  const calendarStyle = useMemo(() => (
    <style>{`
      .wallet-datepicker-popper[data-placement] {
        z-index: 1060 !important;
      }
      .wallet-datepicker-popper.react-datepicker {
        font-family: inherit;
        border-color: var(--border);
        border-radius: 0.75rem;
        background: var(--surface);
        box-shadow: 0 8px 32px rgba(0,0,0,0.12);
        transition: opacity 0.15s ease;
      }
      .wallet-datepicker-popper .react-datepicker__header {
        background: var(--surface-muted);
        border-bottom-color: var(--border);
        padding: 10px 0 6px;
      }
      .wallet-datepicker-popper .react-datepicker__current-month,
      .wallet-datepicker-popper .react-datepicker__day-name {
        color: var(--text);
        font-weight: 600;
        letter-spacing: 0.01em;
      }
      .wallet-datepicker-popper .react-datepicker__day {
        color: var(--text);
        border-radius: 6px;
        transition: background 0.12s ease, color 0.12s ease;
        line-height: 1.8;
      }
      .wallet-datepicker-popper .react-datepicker__day:hover {
        background: var(--primary);
        color: #fff;
      }
      .wallet-datepicker-popper .react-datepicker__day--selected,
      .wallet-datepicker-popper .react-datepicker__day--keyboard-selected {
        background: var(--primary);
        color: #fff;
        font-weight: 600;
      }
      .wallet-datepicker-popper .react-datepicker__day--today {
        font-weight: 700;
        position: relative;
      }
      .wallet-datepicker-popper .react-datepicker__day--today:not(.react-datepicker__day--selected):not(.react-datepicker__day--keyboard-selected) {
        background: rgba(67, 97, 238, 0.08);
        color: var(--primary);
      }
      .wallet-datepicker-popper .react-datepicker__day--outside-month {
        color: var(--text-muted);
      }
      .wallet-datepicker-popper .react-datepicker__day--disabled {
        color: var(--border) !important;
        cursor: not-allowed;
      }
      .wallet-datepicker-popper .react-datepicker__navigation-icon::before {
        border-color: var(--text-secondary);
        transition: border-color 0.15s ease;
      }
      .wallet-datepicker-popper .react-datepicker__navigation:hover .react-datepicker__navigation-icon::before {
        border-color: var(--primary);
      }
      .wallet-datepicker-popper .react-datepicker__close-icon::after {
        background: var(--text-muted);
        transition: background 0.15s ease;
      }
      .wallet-datepicker-popper .react-datepicker__close-icon:hover::after {
        background: var(--text-secondary);
      }
      .wallet-datepicker-popper .react-datepicker__day:focus-visible {
        outline: 2px solid var(--primary);
        outline-offset: 2px;
      }
    `}</style>
  ), []);

  return (
    <>
      {calendarStyle}
      <section
        className="card border-0 overflow-hidden shadow-sm"
        style={{ borderRadius: '1.25rem', background: c.surface }}
      >
        <div className="card-body p-0">
          <div
            className="p-4 p-md-5 text-white position-relative"
            style={{
              background: h.gradient,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
            }}
          >
            <div
              className="position-absolute rounded-circle"
              style={{
                width: '18rem', height: '18rem',
                background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 65%)',
                top: '-8rem', right: '-4rem', pointerEvents: 'none',
              }}
            />
            <div
              className="position-absolute rounded-circle"
              style={{
                width: '10rem', height: '10rem',
                background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 65%)',
                bottom: '-3rem', right: '8rem', pointerEvents: 'none',
              }}
            />
            <div
              className="position-absolute rounded-circle"
              style={{
                width: '5rem', height: '5rem',
                background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 65%)',
                top: '1.5rem', left: '25%', pointerEvents: 'none',
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
                      width: '0.5rem', height: '0.5rem',
                      background: eligibleForWithdrawal ? c.success : c.warning,
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
                disabled={disabled || !eligibleForWithdrawal}
                onClick={onWithdrawClick}
                type="button"
                style={{
                  borderRadius: '0.75rem',
                  fontSize: '0.875rem',
                  background: eligibleForWithdrawal ? h.heroBtnIdle : 'rgba(255,255,255,0.1)',
                  color: eligibleForWithdrawal ? h.heroBtnColor : 'rgba(255,255,255,0.35)',
                  boxShadow: eligibleForWithdrawal ? h.heroBtnShadow : 'none',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  cursor: eligibleForWithdrawal ? 'pointer' : 'not-allowed',
                  transform: 'translateY(0)',
                  paddingTop: '0.625rem',
                  paddingBottom: '0.625rem',
                  minWidth: '180px',
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.background = h.heroBtnHover;
                    e.currentTarget.style.boxShadow = h.heroBtnShadowHover;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.background = h.heroBtnIdle;
                    e.currentTarget.style.boxShadow = h.heroBtnShadow;
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
                onMouseDown={(e) => {
                  if (!e.currentTarget.disabled) e.currentTarget.style.transform = 'scale(0.97)';
                }}
                onMouseUp={(e) => {
                  if (!e.currentTarget.disabled) e.currentTarget.style.transform = 'translateY(-1px)';
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>payments</span>
                Withdraw via PayPal
              </button>
            </div>

            <div
              style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12) 20%, rgba(255,255,255,0.12) 80%, transparent)',
              }}
            />
          </div>
        </div>
      </section>
    </>
  );
}
