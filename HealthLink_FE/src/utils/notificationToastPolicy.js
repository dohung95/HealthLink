export const WORKFLOW_NOTIFICATION_TYPES = new Set([
  'NEW_PHARMACY_REQUEST',
  'PHARMACY_REQUEST_STATUS',
  'NEW_ORDER',
  'ORDER_STATUS',
  'PAYMENT_REQUIRED',
  'INVOICE_PAID',
  'CANCEL_ORDER',
]);

const TYPE_WIDE_KEYS = new Set([
  'NEW_PHARMACY_REQUEST',
  'NEW_ORDER',
  'PAYMENT_REQUIRED',
  'INVOICE_PAID',
  'CANCEL_ORDER',
]);

function normalizeKeyPart(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function extractIdFromActionUrl(actionUrl, pattern) {
  const match = String(actionUrl || '').match(pattern);
  return match ? match[1] : null;
}

export function getNotificationEntityId(notification = {}) {
  return notification.relatedId
    || notification.orderId
    || notification.requestId
    || extractIdFromActionUrl(notification.actionUrl, /\/pharmacy-orders\/([^/]+)/)
    || extractIdFromActionUrl(notification.actionUrl, /\/payment\/order\/([^/]+)/)
    || extractIdFromActionUrl(notification.actionUrl, /\/pharmacy-requests\/([^/]+)/)
    || null;
}

export function getNotificationSurfaceKey(notification = {}) {
  const type = String(notification.type || '').toUpperCase();
  if (!WORKFLOW_NOTIFICATION_TYPES.has(type)) return null;

  const entityId = getNotificationEntityId(notification) || 'global';
  if (TYPE_WIDE_KEYS.has(type)) {
    return `${type}:${entityId}`;
  }

  const titleKey = normalizeKeyPart(notification.title);
  if (titleKey) return `${type}:${entityId}:${titleKey}`;

  const messageKey = normalizeKeyPart(notification.message).slice(0, 48);
  return `${type}:${entityId}:${messageKey || 'update'}`;
}

export function getWorkflowToastId(notification = {}) {
  const key = getNotificationSurfaceKey(notification);
  return key ? `workflow-toast:${key}` : null;
}

const workflowToastSuppressUntil = new Map();

export function suppressWorkflowToast(toastId, ttlMs = 15000) {
  if (!toastId) return;
  workflowToastSuppressUntil.set(toastId, Date.now() + ttlMs);
}

export function clearWorkflowToastSuppression(toastId) {
  if (!toastId) return;
  workflowToastSuppressUntil.delete(toastId);
}

export function isWorkflowToastSuppressed(toastId) {
  if (!toastId) return false;
  const suppressUntil = workflowToastSuppressUntil.get(toastId);
  if (!suppressUntil) return false;
  if (suppressUntil <= Date.now()) {
    workflowToastSuppressUntil.delete(toastId);
    return false;
  }
  return true;
}

export function getWorkflowToastKind(notification = {}) {
  const type = String(notification.type || '').toUpperCase();
  const text = `${notification.title || ''} ${notification.message || ''}`.toLowerCase();

  if (type === 'INVOICE_PAID') return 'success';
  if (type === 'PAYMENT_REQUIRED') return 'warning';
  if (type === 'CANCEL_ORDER') return 'error';
  if (type === 'NEW_PHARMACY_REQUEST' || type === 'NEW_ORDER' || type === 'PHARMACY_REQUEST_STATUS') {
    return 'info';
  }

  if (type === 'ORDER_STATUS') {
    if (/\b(cancelled|canceled|rejected|failed|refunded)\b/.test(text)) return 'error';
    if (/\b(payment required|quote|fee|revision|requires confirmation|change requested)\b/.test(text)) return 'warning';
    if (/\b(completed|confirmed|delivered|ready|shipped|paid|successful)\b/.test(text)) return 'success';
    return 'info';
  }

  return 'message';
}

export function isBrowserTabVisible(doc = document) {
  return !doc || doc.visibilityState === 'visible';
}

export function shouldShowInAppWorkflowToast(notification = {}, doc = document) {
  const type = String(notification.type || '').toUpperCase();
  return WORKFLOW_NOTIFICATION_TYPES.has(type) && isBrowserTabVisible(doc);
}

export function shouldShowNativeWorkflowNotification(notification = {}, doc = document) {
  const type = String(notification.type || '').toUpperCase();
  return WORKFLOW_NOTIFICATION_TYPES.has(type) && !isBrowserTabVisible(doc);
}
