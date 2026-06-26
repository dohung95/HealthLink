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
          <label className="wallet-tx-filter-label">Search</label>
          <div className="wallet-tx-filter-group">
            <span className="wallet-tx-filter-group-icon">
              <span className="material-symbols-outlined">search</span>
            </span>
            <input
              className="wallet-tx-filter-input"
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
          <label className="wallet-tx-filter-label">Type</label>
          <div className="wallet-tx-filter-select-wrap">
            <select
              className="wallet-tx-filter-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="earning">Earnings</option>
              <option value="withdrawal">Withdrawals</option>
            </select>
            <span className="wallet-tx-filter-select-icon">
              <span className="material-symbols-outlined">expand_more</span>
            </span>
          </div>
        </div>
        <div className="wallet-tx-filter-col wallet-tx-filter-col--select">
          <label className="wallet-tx-filter-label">Status</label>
          <div className="wallet-tx-filter-select-wrap">
            <select
              className="wallet-tx-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="completed">Completed</option>
              <option value="pending">Processing/Pending</option>
              <option value="failed">Failed/Cancelled</option>
            </select>
            <span className="wallet-tx-filter-select-icon">
              <span className="material-symbols-outlined">expand_more</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
