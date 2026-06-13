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

export const ORDER_TABS = ['ALL', 'PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SHIPPING', 'DELIVERED', 'CANCELLED'];

export const DEFAULT_STAGE_GROUP = 'NEW_REQUESTS';

export const STAGE_GROUPS = [
  { key: 'NEW_REQUESTS', label: 'New Requests', stages: ['NEW_REQUEST'] },
  { key: 'CONSULTING', label: 'Consulting', stages: ['CONSULTING', 'REVISION_REQUESTED'] },
  { key: 'PAYMENT_DUE', label: 'Payment Due', stages: ['AWAITING_PAYMENT'] },
  { key: 'DELIVERY', label: 'Delivery', stages: ['PREPARING', 'READY', 'SHIPPING', 'DELIVERED'] },
  { key: 'HISTORY', label: 'History', stages: ['COMPLETED', 'CANCELLED', 'REFUNDED'] },
];

export const WORKFLOW_STAGES = [
  'NEW_REQUEST',
  'CONSULTING',
  'REVISION_REQUESTED',
  'AWAITING_PAYMENT',
  'PREPARING',
  'READY',
  'SHIPPING',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED',
];

export const STAGE_LABELS = {
  NEW_REQUEST: 'New Requests',
  CONSULTING: 'Consulting',
  REVISION_REQUESTED: 'Revision Requested',
  AWAITING_PAYMENT: 'Payment Due',
  PREPARING: 'Preparing',
  READY: 'Ready',
  SHIPPING: 'Shipping',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

export function getNextActionHint(item) {
  const actions = item.availableActions || [];
  const stage = item.workflowStage;
  if (actions.includes('ACCEPT_REQUEST')) return 'Accept request';
  if (actions.includes('CREATE_ORDER')) return 'Create order';
  if (actions.includes('UPDATE_ORDER_STATUS')) {
    if (item.orderStatus === 'PREPARING') return 'Mark ready';
    if (item.orderStatus === 'READY') return 'Mark delivered';
    if (item.orderStatus === 'SHIPPING') return 'Mark delivered';
    if (item.orderStatus === 'DELIVERED') return 'Mark completed';
    return 'Update status';
  }
  if (actions.includes('CANCEL_ORDER')) return 'Cancel order';
  if (stage === 'AWAITING_PAYMENT') return 'Waiting for payment';
  if (stage === 'REVISION_REQUESTED') return 'Revise order';
  return 'View details';
}

export function stageClass(stage) {
  const s = stage || '';
  if (['COMPLETED', 'DELIVERED', 'READY'].includes(s)) return 'is-success';
  if (['PREPARING', 'SHIPPING', 'CONSULTING'].includes(s)) return 'is-processing';
  if (['CANCELLED', 'REFUNDED'].includes(s)) return 'is-danger';
  if (['NEW_REQUEST'].includes(s)) return 'is-pending';
  if (['AWAITING_PAYMENT', 'REVISION_REQUESTED'].includes(s)) return 'is-waiting';
  return 'is-pending';
}

export function orderStatusLabel(status) {
  return titleCase(status);
}
export const REQUEST_TABS = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'IN_REVIEW', label: 'Accepted' },
  { key: 'CANCELLED', label: 'Rejected' },
  { key: 'CONVERTED', label: 'Converted' },
];

export const routeByTab = {
  overview: '/pharmacy-page',
  inventory: '/pharmacy-page/inventory',
  orders: '/pharmacy-page/orders',
  wallet: '/pharmacy-page/wallet',
  profile: '/pharmacy-page/profile',
};

export const navItems = [
  { key: 'overview', label: 'Overview', icon: 'dashboard', path: routeByTab.overview, end: true },
  { key: 'inventory', label: 'Inventory', icon: 'inventory_2', path: routeByTab.inventory },
  { key: 'orders', label: 'Orders', icon: 'receipt_long', path: routeByTab.orders },
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
  if (['COMPLETED', 'DELIVERED', 'READY', 'ORDER_CREATED'].includes(normalized)) return 'is-success';
  if (['PREPARING', 'SHIPPING', 'CONFIRMED', 'IN_REVIEW', 'ACCEPTED'].includes(normalized)) return 'is-processing';
  if (['CANCELLED', 'REFUNDED'].includes(normalized)) return 'is-danger';
  if (['NEW_REQUEST', 'AWAITING_PATIENT_CONFIRMATION', 'AWAITING_PAYMENT', 'REVISION_REQUESTED'].includes(normalized)) return 'is-pending';
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

export function exportCsv(rows, filename, columns) {
  const csv = rows.map((row) => {
    if (columns) {
      return columns.map((col) => `"${String(row[col] ?? '').replace(/"/g, '""')}"`).join(',');
    }
    return [
      row.orderNumber,
      row.patientName,
      row.status,
      row.paymentStatus,
      row.totalAmount,
      row.createdAt,
    ].map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',');
  });
  const headerRow = columns ? columns.join(',') : 'Order,Patient,Status,Payment,Total,Created At';
  const blob = new Blob([[headerRow, ...csv].join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
