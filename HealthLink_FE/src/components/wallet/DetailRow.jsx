import React from 'react';

export default function DetailRow({ label, value, valueClassName, strong = false }) {
  const ValueTag = strong ? 'strong' : 'span';

  return (
    <div className="d-flex justify-content-between align-items-center gap-3 py-1">
      <span className="small" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <ValueTag
        className={`small fw-semibold text-end ${valueClassName || ''}`}
        style={strong ? { color: 'var(--text-primary)' } : undefined}
      >
        {value}
      </ValueTag>
    </div>
  );
}
