const STATUS_LABELS = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  READY: 'Ready',
  SHIPPING: 'Shipping',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
  REVISION_REQUESTED: 'Revision requested',
};

const REQUEST_LABELS = {
  PENDING: 'Submitted',
  IN_REVIEW: 'Under pharmacy review',
  ORDER_CREATED: 'Quote ready',
  REVISION_REQUESTED: 'Revision requested',
  CANCELLED: 'Cancelled',
  REJECTED: 'Rejected',
};

function normalized(value) {
  return String(value || '').trim().toUpperCase();
}

function toneFor(value) {
  if (['COMPLETED', 'DELIVERED', 'PAID', 'ORDER_CREATED', 'CONFIRMED'].includes(value)) return 'success';
  if (['CANCELLED', 'FAILED', 'REJECTED', 'REFUNDED'].includes(value)) return 'danger';
  if (['PENDING', 'REVISION_REQUESTED', 'AWAITING_PAYMENT'].includes(value)) return 'warning';
  if (['PREPARING', 'READY', 'SHIPPING', 'IN_REVIEW'].includes(value)) return 'info';
  return 'neutral';
}

function valueFor(status, labels) {
  return labels[status] || status.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Unknown';
}

export function getOrderStatusPresentation(order = {}) {
  const status = normalized(order.status || order.workflowStage);
  const paymentStatus = normalized(order.paymentStatus);
  const awaitingConfirmation = Boolean(order.requiresPatientConfirmation);
  const terminal = ['CANCELLED', 'REFUNDED', 'COMPLETED'].includes(status);
  const paymentValue = terminal && paymentStatus === 'PENDING'
    ? 'Not payable'
    : awaitingConfirmation
      ? 'Not started'
      : paymentStatus === 'PENDING'
        ? 'Awaiting payment'
        : valueFor(paymentStatus, { PAID: 'Paid', CANCELLED: 'Cancelled', FAILED: 'Failed', REFUNDED: 'Refunded' });

  return {
    order: {
      key: 'order',
      label: 'Order',
      value: awaitingConfirmation ? 'Awaiting patient confirmation' : valueFor(status, STATUS_LABELS),
      tone: awaitingConfirmation ? 'warning' : toneFor(status),
    },
    payment: paymentStatus ? {
      key: 'payment',
      label: 'Payment',
      value: paymentValue,
      tone: awaitingConfirmation ? 'neutral' : toneFor(paymentStatus),
    } : null,
    fulfillment: {
      key: 'fulfillment',
      label: 'Fulfillment',
      value: normalized(order.deliveryType) === 'DELIVERY' ? 'Delivery' : 'Pickup',
      tone: 'neutral',
    },
  };
}

export function getRequestStatusPresentation(request = {}) {
  const status = normalized(request.status || request.workflowStage);
  return {
    key: 'request',
    label: 'Request',
    value: valueFor(status, REQUEST_LABELS),
    tone: toneFor(status),
  };
}
