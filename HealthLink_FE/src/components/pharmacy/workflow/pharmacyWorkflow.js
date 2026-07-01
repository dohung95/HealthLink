import { normalize, money } from '../../../utils/pharmacy/pharmacyHelpers';

export const REQUEST_STAGE_GROUPS = [
  { key: 'NEW_REQUESTS', label: 'New Requests', stages: ['NEW_REQUEST'] },
  { key: 'CONSULTING', label: 'Consulting', stages: ['CONSULTING', 'REVISION_REQUESTED'] },
];

export const KANBAN_COLUMNS = [
  { key: 'PAYMENT_DUE', label: 'Payment Due', stages: ['AWAITING_PAYMENT'] },
  { key: 'PREPARING', label: 'Preparing', stages: ['PREPARING'] },
  { key: 'READY', label: 'Ready', stages: ['READY'] },
  { key: 'SHIPPING', label: 'Shipping', stages: ['SHIPPING'] },
  { key: 'DELIVERED', label: 'Delivered', stages: ['DELIVERED'] },
];

export const ORDER_LIST_TABS = [
  { key: 'ALL', label: 'All', stages: [] },
  { key: 'PREPARING', label: 'Preparing', stages: ['PREPARING'] },
  { key: 'PAYMENT_DUE', label: 'Payment Due', stages: ['AWAITING_PAYMENT'] },
  { key: 'DELIVERY', label: 'Delivery', stages: ['READY', 'SHIPPING', 'DELIVERED'] },
  { key: 'COMPLETED', label: 'Completed', stages: ['COMPLETED'] },
  { key: 'CANCELLED_REFUNDED', label: 'Cancelled/Refunded', stages: ['CANCELLED', 'REFUNDED'] },
];

export const PHARMACY_WORKFLOW_NOTIFICATION_TYPES = new Set([
  'NEW_PHARMACY_REQUEST',
  'NEW_ORDER',
]);

export const ANNOUNCEMENT_TYPES = new Set([
  'LOW_STOCK_WARNING',
  'MEDICINE_EXPIRY_WARNING',
  'SYSTEM_ANNOUNCEMENT',
]);

export function isAnnouncementType(type) {
  return ANNOUNCEMENT_TYPES.has(type);
}

export function isActionableNotification(type) {
  return !isAnnouncementType(type);
}

export function getWorkflowStage(item) {
  return normalize(item?.workflowStage || item?.orderStatus || item?.status);
}

export function isRequestWorkItem(item) {
  return REQUEST_STAGE_GROUPS.some((group) => group.stages.includes(getWorkflowStage(item)));
}

export function isActiveOrderWorkItem(item) {
  return KANBAN_COLUMNS.some((column) => column.stages.includes(getWorkflowStage(item)));
}

export function isOrderListWorkItem(item) {
  return ORDER_LIST_TABS.some((tab) => tab.stages.includes(getWorkflowStage(item)));
}

export function isDeliveryOrder(item) {
  return normalize(item?.deliveryType) === 'DELIVERY';
}

export function getNextOrderStatus(item) {
  const status = getWorkflowStage(item);
  if (status === 'PREPARING') return 'READY';
  if (status === 'READY') return isDeliveryOrder(item) ? 'SHIPPING' : 'DELIVERED';
  if (status === 'SHIPPING') return 'DELIVERED';
  if (status === 'DELIVERED') return 'COMPLETED';
  return null;
}

export function targetGroupForOrderStatus(status) {
  const normalized = normalize(status);
  const column = KANBAN_COLUMNS.find((entry) => entry.stages.includes(normalized));
  return column?.key || null;
}

export function getItemIdentity(item) {
  return item?.caseId || item?.workItemId || item?.orderId || item?.requestId || item?.orderNumber || '';
}

export function getItemDisplayId(item) {
  if (item?.orderNumber) return item.orderNumber;
  if (item?.displayId) return item.displayId;
  if (item?.orderId) return `#${item.orderId}`;
  if (item?.requestId) return `Request #${item.requestId}`;
  return '-';
}

export function matchesPharmacyWorkflowSearch(item, query) {
  const needle = String(query || '').trim().toLowerCase();
  if (!needle) return true;
  const text = [
    item?.displayId,
    item?.orderNumber,
    item?.patientName,
    item?.deliveryPhoneNumber,
    item?.requestId,
    item?.orderId,
    item?.symptoms,
    item?.description,
  ].filter(Boolean).join(' ').toLowerCase();
  return text.includes(needle);
}

export function getPharmacyNotificationTarget(notification) {
  if (!notification) return '/pharmacy-page/requests?group=NEW_REQUESTS';
  if (notification.type === 'INVOICE_PAID') return '/pharmacy-page/orders';
  if (notification.type === 'ORDER_STATUS') return '/pharmacy-page/orders';
  if (notification.type === 'CANCEL_ORDER') return '/pharmacy-page/order-list?tab=CANCELLED_REFUNDED';
  if (notification.type === 'LOW_STOCK_WARNING') return '/pharmacy-page/inventory?filter=lowStock';
  if (notification.type === 'MEDICINE_EXPIRY_WARNING') return '/pharmacy-page/inventory';
  return '/pharmacy-page/requests?group=NEW_REQUESTS';
}

export function paymentStatusTone(status) {
  const ns = normalize(status);
  if (ns === 'PAID' || ns === 'COMPLETED') return 'is-success';
  if (['REFUNDED', 'FAILED', 'CANCELLED'].includes(ns)) return 'is-danger';
  if (ns === 'PENDING') return 'is-pending';
  return 'is-pending';
}

export function paymentStatusLabel(status) {
  const ns = normalize(status);
  if (ns === 'PAID') return 'Paid';
  if (ns === 'PENDING') return 'Pending';
  if (ns === 'REFUNDED') return 'Refunded';
  if (ns === 'FAILED') return 'Failed';
  if (ns === 'CANCELLED') return 'Cancelled';
  return ns || 'N/A';
}

export function compactCardClass(item) {
  const stage = getWorkflowStage(item);
  if (['COMPLETED', 'DELIVERED', 'READY'].includes(stage)) return 'is-card-success';
  if (['PREPARING', 'SHIPPING'].includes(stage)) return 'is-card-processing';
  if (['CANCELLED', 'REFUNDED'].includes(stage)) return 'is-card-danger';
  return 'is-card-default';
}

export function compactCardSubtitle(item) {
  if (item?.patientName) return item.patientName;
  if (item?.deliveryPhoneNumber) return item.deliveryPhoneNumber;
  return null;
}

export function compactCardMeta(item) {
  const parts = [];
  if (item?.deliveryType) parts.push(item.deliveryType);
  if (item?.items?.length) parts.push(`${item.items.length} item${item.items.length > 1 ? 's' : ''}`);
  if (item?.totalAmount != null) parts.push(money(item.totalAmount));
  return parts.join(' · ');
}
