import React from 'react';

const STATUS_CONFIG = {
  PENDING_PAYMENT: { label: 'Payment Pending', icon: 'bi-hourglass-split', className: 'bg-warning text-dark' },
  PAID: { label: 'Payment Received', icon: 'bi-check-circle', className: 'bg-info text-dark' },
  CONFIRMED: { label: 'Confirmed', icon: 'bi-check2-all', className: 'bg-success' },
  NONE: { label: 'No Follow-up', icon: 'bi-x-circle', className: 'bg-secondary' },
};

const FollowUpStatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.NONE;
  return (
    <span className={`badge ${config.className}`}>
      <i className={`bi ${config.icon} me-1`} />
      {config.label}
    </span>
  );
};

export default FollowUpStatusBadge;
