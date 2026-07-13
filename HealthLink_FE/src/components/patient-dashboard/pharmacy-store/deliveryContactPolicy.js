const ADDRESS_CHANGE_STATUSES = new Set(['PENDING', 'CONFIRMED']);
const PHONE_CHANGE_STATUSES = new Set(['PENDING', 'CONFIRMED', 'PREPARING', 'READY']);
const LOCKED_STATUSES = new Set(['SHIPPING', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED']);

const normalized = (value) => String(value || '').trim().toUpperCase();
const isDeliveryOrder = (order) => normalized(order?.deliveryType) === 'DELIVERY';

export function isDeliveryContactLocked(order) {
  return !isDeliveryOrder(order) || LOCKED_STATUSES.has(normalized(order?.status));
}

export function canEditDeliveryAddress(order) {
  return isDeliveryOrder(order)
    && ADDRESS_CHANGE_STATUSES.has(normalized(order?.status))
    && normalized(order?.paymentStatus) !== 'PAID';
}

export function canEditDeliveryPhone(order) {
  return isDeliveryOrder(order) && PHONE_CHANGE_STATUSES.has(normalized(order?.status));
}
