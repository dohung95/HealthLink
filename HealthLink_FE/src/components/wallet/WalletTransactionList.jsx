import React, { useState } from 'react';
import { formatCurrency, formatDateTime, formatStatus, getBadgeClass } from './WalletHelpers';
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
              <span className="material-symbols-outlined">receipt_long</span>
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
              : <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>refresh</span>
            }
            {refreshLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        <div className="wallet-tx-empty">
          <div className="wallet-tx-empty-icon">
            <span className="material-symbols-outlined">{filtersActive ? 'search_off' : 'receipt_long'}</span>
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
            <span className="material-symbols-outlined">receipt_long</span>
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
            : <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>refresh</span>
          }
          {refreshLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="wallet-tx-list">
        {transactions.map((entry) => {
          const isExpanded = expandedEntryId === entry.id;
          const isPositive = Number(entry.amount) >= 0;
          const entryKind = entry.kind;

          const iconName = entryKind === 'earning'
            ? (entry.raw.sourceType === 'PHARMACY_ORDER' ? 'shopping_cart' : 'videocam')
            : 'account_balance';

          return (
            <div key={entry.id} className="wallet-tx-item">
              <div className={`wallet-tx-item-strip wallet-tx-item-strip--${isPositive ? 'positive' : 'negative'}`} />

              <div
                className="wallet-tx-item-main"
                onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
              >
                <div className="wallet-tx-item-left">
                  <div className={`wallet-tx-item-icon wallet-tx-item-icon--${entryKind}`}>
                    <span className="material-symbols-outlined">{iconName}</span>
                  </div>
                  <div className="wallet-tx-item-info">
                    <span className="wallet-tx-item-title">{entry.title}</span>
                    <span className="wallet-tx-item-date">{formatDateTime(entry.createdAt)}</span>
                  </div>
                </div>

                <div className="wallet-tx-item-right">
                  <div className="wallet-tx-item-amount-group">
                    <span className={`wallet-tx-item-amount ${isPositive ? 'wallet-tx-item-amount--positive' : 'wallet-tx-item-amount--negative'}`}>
                      {isPositive ? '+' : ''}{formatCurrency(entry.amount)}
                    </span>
                    <span className={`wallet-tx-item-badge wallet-tx-item-badge--${getBadgeClass(entry.status)}`}>
                      {formatStatus(entry.status)}
                    </span>
                  </div>
                  <button
                    className="wallet-tx-item-expand"
                    onClick={(e) => { e.stopPropagation(); setExpandedEntryId(isExpanded ? null : entry.id); }}
                    type="button"
                  >
                    <span className={`material-symbols-outlined ${isExpanded ? 'rotated' : ''}`}>expand_more</span>
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="wallet-tx-details">
                  <div className="wallet-tx-details-inner">
                    <div className="wallet-tx-details-grid">
                      {entryKind === 'earning' ? (
                        <>
                          <div className="wallet-tx-details-item">
                            <span className="wallet-tx-details-label">Time</span>
                            <span className="wallet-tx-details-value">{formatDateTime(entry.raw.createdAt)}</span>
                          </div>
                          <div className="wallet-tx-details-item wallet-tx-details-item--right">
                            <span className="wallet-tx-details-label">Appointment Fee</span>
                            <span className="wallet-tx-details-value wallet-tx-details-value--positive">{formatCurrency(entry.raw.grossAmount)}</span>
                          </div>
                          <div className="wallet-tx-details-item">
                            <span className="wallet-tx-details-label">
                              {entry.raw.sourceType === 'PHARMACY_ORDER' ? 'Order' : 'Appointment'}
                            </span>
                            <span className="wallet-tx-details-value">
                              #{(entry.raw.pharmacyOrderId || entry.raw.appointmentId || '-')}
                            </span>
                          </div>
                          <div className="wallet-tx-details-item wallet-tx-details-item--right">
                            <span className="wallet-tx-details-label">Commission</span>
                            <span className="wallet-tx-details-value wallet-tx-details-value--negative">
                              -{formatCurrency(entry.raw.commissionAmount).replace('-', '')}
                            </span>
                          </div>
                          <div className="wallet-tx-details-item">
                            <span className="wallet-tx-details-label">Status</span>
                            <span className="wallet-tx-details-value">{formatStatus(entry.raw.status)}</span>
                          </div>
                          <div className="wallet-tx-details-item wallet-tx-details-item--right">
                            <span className="wallet-tx-details-label">Net Received</span>
                            <span className="wallet-tx-details-value wallet-tx-details-value--positive">{formatCurrency(entry.raw.netAmount)}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="wallet-tx-details-item">
                            <span className="wallet-tx-details-label">Time</span>
                            <span className="wallet-tx-details-value">{formatDateTime(entry.raw.createdAt)}</span>
                          </div>
                          <div className="wallet-tx-details-item wallet-tx-details-item--right">
                            <span className="wallet-tx-details-label">Settlement</span>
                            <span className="wallet-tx-details-value">{entry.raw.settlementNumber || entry.raw.settlementId || '-'}</span>
                          </div>
                          <div className="wallet-tx-details-item">
                            <span className="wallet-tx-details-label">PayPal</span>
                            <span className="wallet-tx-details-value">{entry.raw.paypalEmail || '-'}</span>
                          </div>
                          <div className="wallet-tx-details-item wallet-tx-details-item--right">
                            <span className="wallet-tx-details-label">Amount</span>
                            <span className="wallet-tx-details-value wallet-tx-details-value--negative">
                              -{formatCurrency(entry.raw.netAmount).replace('-', '')}
                            </span>
                          </div>
                          <div className="wallet-tx-details-item">
                            <span className="wallet-tx-details-label">Status</span>
                            <span className="wallet-tx-details-value">{formatStatus(entry.raw.status)}</span>
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
