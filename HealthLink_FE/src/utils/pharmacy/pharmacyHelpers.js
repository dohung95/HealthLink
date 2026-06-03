import { useEffect, useState } from 'react';

export const ORDER_FLOW = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['SHIPPING', 'DELIVERED', 'CANCELLED'],
  SHIPPING: ['DELIVERED'],
  DELIVERED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: ['REFUNDED'],
  REFUNDED: [],
};

export const ORDER_TABS = ['ALL', 'PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'];
export const REQUEST_TABS = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'IN_REVIEW', label: 'Accepted' },
  { key: 'CANCELLED', label: 'Rejected' },
  { key: 'CONVERTED', label: 'Converted' },
];

export const routeByTab = {
  overview: '/pharmacy-page',
  orders: '/pharmacy-page/orders',
  consultations: '/pharmacy-page/consultations',
  wallet: '/pharmacy-page/wallet',
  profile: '/pharmacy-page/profile',
};

export const navItems = [
  { key: 'overview', label: 'Overview', icon: 'dashboard', path: routeByTab.overview, end: true },
  { key: 'orders', label: 'Orders', icon: 'receipt_long', path: routeByTab.orders },
  { key: 'consultations', label: 'Consultation Requests', icon: 'medical_services', path: routeByTab.consultations },
  { key: 'wallet', label: 'Wallet / Settlement', icon: 'account_balance_wallet', path: routeByTab.wallet },
  { key: 'profile', label: 'Profile & Security', icon: 'shield_person', path: routeByTab.profile },
];

export const money = (value) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
}).format(Number(value ?? 0));

export const dateTime = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const initials = (value = 'PH') => String(value)
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((word) => word[0]?.toUpperCase())
  .join('') || 'PH';

export const normalize = (value) => String(value || '').trim().toUpperCase();
export const getProfileName = (profile) => profile?.name || profile?.pharmacyName || 'HealthLink Pharmacy';
export const getOrderTime = (order) => order?.createdAt || order?.confirmedAt || order?.deliveredAt;

export function statusClass(status) {
  const normalized = normalize(status);
  if (['COMPLETED', 'DELIVERED', 'READY', 'ORDER_CREATED', 'PRESCRIPTION_CREATED'].includes(normalized)) return 'is-success';
  if (['PREPARING', 'SHIPPING', 'CONFIRMED', 'IN_REVIEW'].includes(normalized)) return 'is-processing';
  if (['CANCELLED', 'REFUNDED'].includes(normalized)) return 'is-danger';
  return 'is-pending';
}

export function useDebouncedValue(value, delay = 250) {
  const [deferred, setDeferred] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDeferred(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return deferred;
}

export function titleCase(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function exportCsv(rows, filename) {
  const csv = rows.map((row) => [
    row.orderNumber,
    row.patientName,
    row.status,
    row.paymentStatus,
    row.totalAmount,
    row.createdAt,
  ].map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','));
  const blob = new Blob([['Order,Patient,Status,Payment,Total,Created At', ...csv].join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
