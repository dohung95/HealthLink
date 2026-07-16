import React from 'react';
import WalletDatePicker from './WalletDatePicker';
import './wallet-shared.css';

export default function WalletTransactionFilters({
  searchTerm,
  setSearchTerm,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  typeFilter,
  setTypeFilter,
  statusFilter,
  setStatusFilter,
}) {
  return (
    <div className="wallet-tx-filters">
      <div className="wallet-tx-filters-grid">
        <div className="wallet-tx-filter-col wallet-tx-filter-col--search">
          <label className="wallet-tx-filter-label" htmlFor="wallet-transaction-search">Search</label>
          <div className="wallet-tx-filter-group">
            <span className="wallet-tx-filter-group-icon" aria-hidden="true">
              <span className="material-symbols-outlined">search</span>
            </span>
            <input
              className="wallet-tx-filter-input"
              id="wallet-transaction-search"
              placeholder="Appointment ID, Settlement..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="wallet-tx-filter-col wallet-tx-filter-col--date">
          <label className="wallet-tx-filter-label">From</label>
          <WalletDatePicker
            selected={dateFrom}
            onChange={(date) => setDateFrom(date)}
            placeholderText="From date"
          />
        </div>
        <div className="wallet-tx-filter-col wallet-tx-filter-col--date">
          <label className="wallet-tx-filter-label">To</label>
          <WalletDatePicker
            selected={dateTo}
            onChange={(date) => setDateTo(date)}
            placeholderText="To date"
          />
        </div>
        <div className="wallet-tx-filter-col wallet-tx-filter-col--select">
          <label className="wallet-tx-filter-label" htmlFor="wallet-transaction-type">Type</label>
          <div className="wallet-tx-filter-select-wrap">
            <select
              className="wallet-tx-filter-select"
              id="wallet-transaction-type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="EARNING">Earnings</option>
              <option value="WITHDRAWAL">Withdrawals</option>
              <option value="ADJUSTMENT">Adjustments</option>
            </select>
            <span className="wallet-tx-filter-select-icon" aria-hidden="true">
              <span className="material-symbols-outlined">expand_more</span>
            </span>
          </div>
        </div>
        <div className="wallet-tx-filter-col wallet-tx-filter-col--select">
          <label className="wallet-tx-filter-label" htmlFor="wallet-transaction-status">Status</label>
          <div className="wallet-tx-filter-select-wrap">
            <select
              className="wallet-tx-filter-select"
              id="wallet-transaction-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="PENDING">Pending</option>
              <option value="VESTED">Vested</option>
              <option value="PROCESSING">Processing</option>
              <option value="COMPLETED">Withdrawn</option>
              <option value="FAILED">Failed</option>
              <option value="RETURNED">Returned</option>
              <option value="REFUNDED">Refunded</option>
            </select>
            <span className="wallet-tx-filter-select-icon" aria-hidden="true">
              <span className="material-symbols-outlined">expand_more</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
