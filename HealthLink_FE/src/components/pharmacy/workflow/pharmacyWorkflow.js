import { normalize, money } from '../../../utils/pharmacy/pharmacyHelpers.js';

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

export const PHARMACY_SOUND_TOAST_TYPES = new Set([
  'NEW_PHARMACY_REQUEST',
  'NEW_ORDER',
]);

export const PHARMACY_ANNOUNCEMENT_TYPES = new Set([
  'NEW_PHARMACY_REQUEST',
  'NEW_ORDER',
  'INVOICE_PAID',
  'CANCEL_ORDER',
  'LOW_STOCK_WARNING',
  'MEDICINE_EXPIRY_WARNING',
]);

export const PHARMACY_WORKFLOW_NOTIFICATION_TYPES = PHARMACY_SOUND_TOAST_TYPES;

export function isPharmacyAnnouncementType(type) {
  return PHARMACY_ANNOUNCEMENT_TYPES.has(type);
}

export function isPharmacySoundToastType(type) {
  return PHARMACY_SOUND_TOAST_TYPES.has(type);
}

export function isAnnouncementType(type) {
  return isPharmacyAnnouncementType(type);
}

export function isActionableNotification(type) {
  return !isPharmacyAnnouncementType(type);
}

export function getWorkflowStage(item) {
  return normalize(item?.workflowStage || item?.orderStatus || item?.status);
}

export function getOrderWorkflowStage(order) {
  const status = normalize(order?.workflowStage || order?.orderStatus || order?.status);

  if (status === 'CONFIRMED') return 'AWAITING_PAYMENT';

  if (status === 'PENDING') {
    if (order?.requiresPatientConfirmation || order?.patientConfirmationRequestedAt || order?.deliveryFee != null) {
      return 'AWAITING_PAYMENT';
    }
    return 'NEW_REQUEST';
  }

  return status || 'UNKNOWN';
}

export function mapOrderToWorkflowItem(order) {
  if (!order?.orderId) return null;
  const workflowStage = getOrderWorkflowStage(order);
  return {
    ...order,
    workflowStage,
    orderStatus: order.status || order.orderStatus,
    hasOrder: true,
    displayId: order.orderNumber || `#${order.orderId}`,
  };
}

export function getPharmacyNavBadgeCounts({ workItems, orders } = {}) {
  const closedRequestStatuses = new Set(['CANCELLED', 'REJECTED']);
  const terminalOrderStatuses = new Set(['DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED']);
  const workItemList = Array.isArray(workItems) ? workItems : [];

  const requests = workItemList.filter((item) => {
    const stage = getWorkflowStage(item);
    const requestStatus = normalize(item?.requestStatus);
    const orderStatus = normalize(item?.orderStatus);

    return stage === 'NEW_REQUEST'
      && !closedRequestStatuses.has(requestStatus)
      && !terminalOrderStatuses.has(orderStatus);
  }).length;

  const paidPreparing = mergeWorkflowItemsWithOrders(workItems, orders).filter((item) => (
    getWorkflowStage(item) === 'PREPARING'
    && normalize(item?.paymentStatus) === 'PAID'
  )).length;

  return { requests, orders: paidPreparing };
}

export function mergeWorkflowItemsWithOrders(workItems, orders) {
  const workItemList = Array.isArray(workItems) ? workItems : [];
  const orderList = Array.isArray(orders) ? orders : [];
  const seenOrderIds = new Set(workItemList.map((item) => item.orderId).filter(Boolean));
  const mappedOrders = orderList
    .filter((order) => order?.orderId && !seenOrderIds.has(order.orderId))
    .map(mapOrderToWorkflowItem)
    .filter(Boolean);
  return [...workItemList, ...mappedOrders];
}

export function isRequestWorkItem(item) {
  return REQUEST_STAGE_GROUPS.some((group) => group.stages.includes(getWorkflowStage(item)));
}

export function isActiveOrderWorkItem(item) {
  return KANBAN_COLUMNS.some((column) => column.stages.includes(getWorkflowStage(item)));
}

export function isOrderListWorkItem(item) {
  return getWorkflowStage(item) === 'REVISION_REQUESTED'
    || ORDER_LIST_TABS.some((tab) => tab.stages.includes(getWorkflowStage(item)));
}

export function isDeliveryOrder(item) {
  return normalize(item?.deliveryType) === 'DELIVERY';
}

export function isDeliveryOrderRequest(item) {
  const requestType = normalize(item?.requestType || item?.sourceType);
  const sourceType = normalize(item?.sourceType);
  const deliveryType = normalize(item?.preferredDeliveryType || item?.deliveryType);
  return (requestType === 'ORDER_REQUEST' || sourceType === 'ORDER_REQUEST')
    && deliveryType === 'DELIVERY'
    && !item?.orderId;
}

export function getNextOrderStatus(item) {
  const status = getWorkflowStage(item);
  if (status === 'PREPARING') return 'READY';
  if (status === 'READY') return isDeliveryOrder(item) ? 'SHIPPING' : 'COMPLETED';
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

export function getWorkItemKind(item) {
  if (!item) return 'order';
  if (item.workflowStage === 'REVISION_REQUESTED' || item.availableActions?.includes('UPDATE_QUOTE')) return 'revision';
  if (item.sourceType === 'CONSULTATION_REQUEST' && item.requestType === 'CONSULTATION') return 'consultation';
  if (isDeliveryOrderRequest(item)) return 'deliveryOrderRequest';
  if (item.sourceType === 'ORDER_REQUEST' || item.requestType === 'ORDER_REQUEST') return 'orderRequest';
  if (item.sourceType === 'RETAIL_ORDER') return 'retailReview';
  if (item.sourceType === 'DELIVERY_QUOTE_REQUEST') return 'deliveryQuote';
  if (item.sourceType === 'PICKUP_ORDER_REVIEW') return 'pickupReview';
  if (item.sourceType === 'DELIVERY_CONTACT_CHANGE_REQUEST') return 'deliveryContactChange';
  return 'order';
}

export const ACTION_LABELS = {
  SEND_DELIVERY_QUOTE: { label: 'Send quote', className: 'btn btn-sm btn-primary' },
  APPROVE_DELIVERY_CONTACT_CHANGE: { label: 'Approve', className: 'btn btn-sm btn-success' },
  REJECT_DELIVERY_CONTACT_CHANGE: { label: 'Reject', className: 'btn btn-sm btn-outline-danger' },
};

export function canUseRequestChat(item) {
  if (!item) return false;
  if (getWorkItemKind(item) !== 'consultation') return false;
  const stage = (item.workflowStage || '').toUpperCase();
  if (stage !== 'CONSULTING' && stage !== 'IN_REVIEW') return false;
  return !!item.chatRoomId;
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

function isInternalPharmacyPath(actionUrl) {
  return String(actionUrl || '').startsWith('/pharmacy-page/');
}

function parsePositiveInteger(value) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function isRevisionWorkflowNotification(notification = {}) {
  return String(notification.type || '').toUpperCase() === 'ORDER_STATUS'
    && String(notification.actionUrl || '').startsWith('/pharmacy-page/requests');
}

export function getWorkflowNotificationOrderId(notification = {}) {
  const relatedId = parsePositiveInteger(notification.relatedId || notification.orderId);
  if (relatedId) return relatedId;

  try {
    const url = new URL(String(notification.actionUrl || ''), 'https://healthlink.local');
    return parsePositiveInteger(url.searchParams.get('orderId'));
  } catch {
    return null;
  }
}

export function getPharmacyNotificationTarget(notification) {
  const type = notification?.type;
  if (isInternalPharmacyPath(notification?.actionUrl)) return notification.actionUrl;
  if (type === 'NEW_PHARMACY_REQUEST') return '/pharmacy-page/requests';
  if (type === 'NEW_ORDER') return '/pharmacy-page/orders';
  if (type === 'INVOICE_PAID') return '/pharmacy-page/orders';
  if (type === 'CANCEL_ORDER') return '/pharmacy-page/order-list?tab=CANCELLED_REFUNDED';
  if (type === 'LOW_STOCK_WARNING') return '/pharmacy-page/inventory?filter=lowStock';
  if (type === 'MEDICINE_EXPIRY_WARNING') return '/pharmacy-page/inventory?filter=expiringSoon';
  if (type === 'ORDER_STATUS') return '/pharmacy-page/orders';
  return '/pharmacy-page/requests';
}

export function getPharmacyAnnouncementCopy(notification) {
  const type = notification?.type;

  if (type === 'NEW_PHARMACY_REQUEST') {
    return { icon: 'notifications_active', text: 'New request waiting for intake' };
  }

  if (type === 'NEW_ORDER') {
    return { icon: 'receipt_long', text: 'New order received' };
  }

  if (type === 'INVOICE_PAID') {
    return { icon: 'payments', text: 'Payment confirmed, order ready to prepare' };
  }

  if (type === 'CANCEL_ORDER') {
    return { icon: 'cancel', text: 'Order cancelled/refunded' };
  }

  if (type === 'LOW_STOCK_WARNING') {
    return { icon: 'inventory_2', text: 'Low stock items need attention' };
  }

  if (type === 'MEDICINE_EXPIRY_WARNING') {
    return { icon: 'calendar_month', text: 'Expiring medicines need review' };
  }

  return { icon: 'campaign', text: 'Pharmacy workflow is up to date' };
}

export const PHARMACY_IDLE_ANNOUNCEMENTS = [
  {
    key: 'waiting-requests',
    icon: 'tips_and_updates',
    text: 'Review waiting requests before intake slows down',
    target: '/pharmacy-page/requests?group=NEW_REQUESTS',
  },
  {
    key: 'paid-orders',
    icon: 'tips_and_updates',
    text: 'Paid orders are ready for preparing',
    target: '/pharmacy-page/orders',
  },
  {
    key: 'ready-handoff',
    icon: 'tips_and_updates',
    text: 'Keep ready orders moving to handoff',
    target: '/pharmacy-page/orders',
  },
  {
    key: 'low-stock',
    icon: 'tips_and_updates',
    text: 'Check low-stock medicines before peak hours',
    target: '/pharmacy-page/inventory?filter=lowStock',
  },
  {
    key: 'expiry-review',
    icon: 'tips_and_updates',
    text: 'Review expiring medicines during quiet periods',
    target: '/pharmacy-page/inventory?filter=expiringSoon',
  },
  {
    key: 'order-list',
    icon: 'tips_and_updates',
    text: 'Completed and refunded records are in Order List',
    target: '/pharmacy-page/order-list?tab=ALL',
  },
];

export function getPharmacyIdleAnnouncement(index = 0) {
  const safeIndex = Number.isFinite(index) ? Math.abs(index) : 0;
  return PHARMACY_IDLE_ANNOUNCEMENTS[safeIndex % PHARMACY_IDLE_ANNOUNCEMENTS.length];
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
  if (stage === 'AWAITING_PAYMENT') return 'is-card-payment-due';
  if (['PREPARING', 'READY', 'SHIPPING'].includes(stage)) return 'is-card-active';
  if (stage === 'DELIVERED') return 'is-card-success';
  if (['CANCELLED', 'REFUNDED'].includes(stage)) return 'is-card-danger';
  return 'is-card-default';
}

export function compactCardSubtitle(item) {
  return item?.deliveryPhoneNumber || item?.patientPhone || item?.phone || null;
}

export function compactCardMeta(item) {
  const parts = [];
  if (item?.items?.length) parts.push(`${item.items.length} item${item.items.length > 1 ? 's' : ''}`);
  if (item?.totalAmount != null) parts.push(money(item.totalAmount));
  return parts.join(' | ');
}

export function buildDeliveryContactReviewPayload({
  status,
  deliveryFee,
  estimatedDeliveryMinutes,
  pharmacyReviewNotes,
}) {
  const normalizedStatus = normalize(status);
  if (normalizedStatus === 'REJECTED') {
    return {
      status: 'REJECTED',
      pharmacyReviewNotes: pharmacyReviewNotes?.trim() || undefined,
    };
  }
  if (normalizedStatus !== 'APPROVED') return null;

  if (deliveryFee === '' || deliveryFee == null || estimatedDeliveryMinutes === '' || estimatedDeliveryMinutes == null) {
    return null;
  }
  const fee = Number(deliveryFee);
  const minutes = Number(estimatedDeliveryMinutes);
  if (!Number.isFinite(fee) || fee < 0 || !Number.isInteger(minutes) || minutes < 1 || minutes > 999) {
    return null;
  }
  return {
    status: 'APPROVED',
    deliveryFee: fee,
    estimatedDeliveryMinutes: minutes,
    pharmacyReviewNotes: pharmacyReviewNotes?.trim() || undefined,
  };
}
