import React, { useState } from 'react';
import { formatCurrency, formatDateTime } from './WalletHelpers';
import { getWalletEntryPresentation } from './wallet-entry-view-model';
import './wallet-shared.css';

export default function WalletTransactionList({
  transactions,
  loading,
  filtersActive,
  onRefresh,
  refreshLoading,
}) {
  const [expandedEntryId, setExpandedEntryId] = useState(null);

  if (loading && transactions.length === 0) {
    return (
      <div className="wallet-tx-empty">
        <div className="spinner-border mb-3" role="status" style={{ width: '2.5rem', height: '2.5rem', color: 'var(--primary)' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="wallet-tx-empty-title">Loading wallet...</p>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <>
        <div className="wallet-tx-header">
          <div className="wallet-tx-header-left">
            <div className="wallet-tx-header-icon">
              <span aria-hidden="true" className="material-symbols-outlined">receipt_long</span>
            </div>
            <div>
              <h3 className="wallet-tx-header-title">Recent Transactions</h3>
            </div>
          </div>
          <button
            className="wallet-tx-header-refresh"
            disabled={refreshLoading}
            onClick={onRefresh}
            type="button"
          >
            {refreshLoading
              ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
              : <span aria-hidden="true" className="material-symbols-outlined" style={{ fontSize: '1rem' }}>refresh</span>
            }
            {refreshLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        <div className="wallet-tx-empty">
          <div className="wallet-tx-empty-icon">
            <span aria-hidden="true" className="material-symbols-outlined">{filtersActive ? 'search_off' : 'receipt_long'}</span>
          </div>
          <p className="wallet-tx-empty-title">
            {filtersActive ? 'No matching transactions found.' : 'No wallet transactions yet.'}
          </p>
          <p className="wallet-tx-empty-desc">
            {filtersActive ? 'Try adjusting your filters.' : 'Your earnings will appear here.'}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="wallet-tx-header">
        <div className="wallet-tx-header-left">
          <div className="wallet-tx-header-icon">
            <span aria-hidden="true" className="material-symbols-outlined">receipt_long</span>
          </div>
          <div>
            <h3 className="wallet-tx-header-title">Recent Transactions</h3>
          </div>
        </div>
        <button
          className="wallet-tx-header-refresh"
          disabled={refreshLoading}
          onClick={onRefresh}
          type="button"
        >
          {refreshLoading
            ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
            : <span aria-hidden="true" className="material-symbols-outlined" style={{ fontSize: '1rem' }}>refresh</span>
          }
          {refreshLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="wallet-tx-list">
        {transactions.map((entry) => {
          const isExpanded = expandedEntryId === entry.id;
          const presentation = entry.presentation || getWalletEntryPresentation(entry.raw || entry);
          const isPositive = presentation.direction === 'positive';
          const rawEntry = entry.raw || entry;
          const signedAmount = `${isPositive ? '+' : '-'}${formatCurrency(Math.abs(Number(entry.amount || 0)))}`;
          const detailsId = `wallet-transaction-details-${entry.id}`;
          const referenceLabel = rawEntry.orderNumber ? 'Order'
            : rawEntry.appointmentId ? 'Appointment'
            : 'Reference';
          const referenceValue = rawEntry.orderNumber
            || String(rawEntry.pharmacyOrderId || rawEntry.appointmentId || rawEntry.entryId || '-');

          return (
            <div key={entry.id} className="wallet-tx-item">
              <div className={`wallet-tx-item-strip wallet-tx-item-strip--${presentation.amountTone}`} />

              <div className="wallet-tx-item-main">
                <div className="wallet-tx-item-left">
                  <div className={`wallet-tx-item-icon wallet-tx-item-icon--${presentation.amountTone}`}>
                    <span aria-hidden="true" className="material-symbols-outlined">{presentation.icon}</span>
                  </div>
                  <div className="wallet-tx-item-info">
                    <span className="wallet-tx-item-title">#{rawEntry.entryId}</span>
                    <span className="wallet-tx-item-date">{formatDateTime(entry.createdAt)}</span>
                  </div>
                </div>

                <div className="wallet-tx-item-right">
                  <div className="wallet-tx-item-amount-group">
                    <span className={`wallet-tx-item-amount wallet-tx-item-amount--${presentation.amountTone} ${presentation.strikeAmount ? 'wallet-tx-item-amount--struck' : ''}`}>
                      {signedAmount}
                    </span>
                    <span className={`wallet-tx-item-badge wallet-tx-item-badge--${presentation.badgeTone}`}>
                      {presentation.statusLabel}
                    </span>
                  </div>
                  <button
                    className="wallet-tx-item-expand"
                    aria-controls={detailsId}
                    aria-expanded={isExpanded}
                    aria-label={`${isExpanded ? 'Hide' : 'Show'} details for #${rawEntry.entryId}`}
                    onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                    type="button"
                  >
                    <span aria-hidden="true" className={`material-symbols-outlined ${isExpanded ? 'rotated' : ''}`}>expand_more</span>
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="wallet-tx-details" id={detailsId} role="region" aria-label={`Details for #${rawEntry.entryId}`}>
                  <div className="wallet-tx-details-inner">
                    <div className="wallet-tx-details-grid">
                      {entry.kind === 'earning' ? (
                        <>
                          <div className="wallet-tx-details-item">
                            <span className="wallet-tx-details-label">Posted</span>
                            <span className="wallet-tx-details-value">{formatDateTime(rawEntry.effectiveAt || entry.createdAt)}</span>
                          </div>
                          <div className="wallet-tx-details-item wallet-tx-details-item--right">
                            <span className="wallet-tx-details-label">Gross</span>
                            <span className="wallet-tx-details-value wallet-tx-details-value--positive">{formatCurrency(Number(rawEntry.grossAmount || 0))}</span>
                          </div>
                          <div className="wallet-tx-details-item">
                            <span className="wallet-tx-details-label">Last updated</span>
                            <span className="wallet-tx-details-value">{formatDateTime(rawEntry.updatedAt || rawEntry.effectiveAt)}</span>
                          </div>
                          <div className="wallet-tx-details-item wallet-tx-details-item--right">
                            <span className="wallet-tx-details-label">Commission</span>
                            <span className="wallet-tx-details-value wallet-tx-details-value--negative">-{formatCurrency(Number(rawEntry.commissionAmount || 0))}</span>
                          </div>
                          <div className="wallet-tx-details-item">
                            <span className="wallet-tx-details-label">{referenceLabel}</span>
                            <span className="wallet-tx-details-value">#{referenceValue}</span>
                          </div>
                          <div className="wallet-tx-details-item wallet-tx-details-item--right">
                            <span className="wallet-tx-details-label">Amount</span>
                            <span className={`wallet-tx-details-value wallet-tx-details-value--${isPositive ? 'positive' : 'negative'}`}>{signedAmount}</span>
                          </div>
                          <div className="wallet-tx-details-item">
                            <span className="wallet-tx-details-label">Status</span>
                            <span className="wallet-tx-details-value">{presentation.statusLabel}</span>
                          </div>
                        </>
                      ) : entry.kind === 'withdrawal' ? (
                        <>
                          <div className="wallet-tx-details-item">
                            <span className="wallet-tx-details-label">Requested</span>
                            <span className="wallet-tx-details-value">{formatDateTime(rawEntry.effectiveAt || entry.createdAt)}</span>
                          </div>
                          <div className="wallet-tx-details-item wallet-tx-details-item--right">
                            <span className="wallet-tx-details-label">Settlement</span>
                            <span className="wallet-tx-details-value wallet-tx-details-value--reference">{rawEntry.settlementNumber || rawEntry.settlementId || '-'}</span>
                          </div>
                          <div className="wallet-tx-details-item">
                            <span className="wallet-tx-details-label">PayPal</span>
                            <span className="wallet-tx-details-value wallet-tx-details-value--email">{rawEntry.paypalEmail || '-'}</span>
                          </div>
                          <div className="wallet-tx-details-item wallet-tx-details-item--right">
                            <span className="wallet-tx-details-label">Amount</span>
                            <span className={`wallet-tx-details-value wallet-tx-details-value--${isPositive ? 'positive' : 'negative'}`}>{signedAmount}</span>
                          </div>
                          <div className="wallet-tx-details-item">
                            <span className="wallet-tx-details-label">Status</span>
                            <span className="wallet-tx-details-value">{presentation.statusLabel}</span>
                          </div>
                          <div className="wallet-tx-details-item wallet-tx-details-item--right">
                            <span className="wallet-tx-details-label">Last updated</span>
                            <span className="wallet-tx-details-value">{formatDateTime(rawEntry.updatedAt || rawEntry.effectiveAt)}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="wallet-tx-details-item">
                            <span className="wallet-tx-details-label">Posted</span>
                            <span className="wallet-tx-details-value">{formatDateTime(rawEntry.effectiveAt || entry.createdAt)}</span>
                          </div>
                          <div className="wallet-tx-details-item wallet-tx-details-item--right">
                            <span className="wallet-tx-details-label">Last updated</span>
                            <span className="wallet-tx-details-value">{formatDateTime(rawEntry.updatedAt || rawEntry.effectiveAt)}</span>
                          </div>
                          <div className="wallet-tx-details-item">
                            <span className="wallet-tx-details-label">Reference</span>
                            <span className="wallet-tx-details-value wallet-tx-details-value--reference">
                              {rawEntry.settlementNumber || rawEntry.settlementId || `#${referenceValue}`}
                            </span>
                          </div>
                          <div className="wallet-tx-details-item wallet-tx-details-item--right">
                            <span className="wallet-tx-details-label">Amount</span>
                            <span className={`wallet-tx-details-value wallet-tx-details-value--${isPositive ? 'positive' : 'negative'}`}>{signedAmount}</span>
                          </div>
                          <div className="wallet-tx-details-item">
                            <span className="wallet-tx-details-label">Status</span>
                            <span className="wallet-tx-details-value">{presentation.statusLabel}</span>
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
    </>
  );
}
