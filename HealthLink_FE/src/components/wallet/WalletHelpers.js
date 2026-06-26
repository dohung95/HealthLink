export const formatCurrency = (value) => {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const formatDateTime = (value) => {
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

export const formatStatus = (status) => {
  if (!status) return 'Pending';
  return String(status)
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export const getBadgeClass = (status) => {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'SETTLED') return 'settled';
  if (['PAID', 'COMPLETED'].includes(normalized)) return 'completed';
  if (['PROCESSING', 'PENDING'].includes(normalized)) return 'pending';
  if (['FAILED', 'REFUNDED', 'CANCELLED'].includes(normalized)) return 'failed';
  return 'completed';
};
