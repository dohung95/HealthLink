import React from 'react';
import './wallet-shared.css';

export default function WalletPagination({ page, totalItems, pageSize, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
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

  if (totalItems === 0) return null;

  return (
    <div className="wallet-tx-pagination">
      <span className="wallet-tx-pagination-info">
        Showing {startItem} to {endItem} of {totalItems} entries
      </span>
      <div className="wallet-tx-pagination-buttons">
        <button
          className="wallet-tx-pagination-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          type="button"
        >
          <span className="material-symbols-outlined">chevron_left</span>
        </button>
        {getPageNumbers().map((p, i) =>
          p === '...' ? (
            <span key={`e${i}`} className="wallet-tx-pagination-ellipsis">...</span>
          ) : (
            <button
              key={p}
              className={`wallet-tx-pagination-btn ${p === page ? 'wallet-tx-pagination-btn--active' : ''}`}
              onClick={() => onPageChange(p)}
              type="button"
            >
              {p}
            </button>
          )
        )}
        <button
          className="wallet-tx-pagination-btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          type="button"
        >
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </div>
    </div>
  );
}
