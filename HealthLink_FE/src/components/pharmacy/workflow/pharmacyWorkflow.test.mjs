import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getNextOrderStatus,
  getPharmacyNotificationTarget,
  getWorkItemKind,
  getWorkflowNotificationOrderId,
  isOrderListWorkItem,
  isRevisionWorkflowNotification,
} from './pharmacyWorkflow.js';

test('consultation revision is classified as revision before consultation', () => {
  assert.equal(getWorkItemKind({
    sourceType: 'CONSULTATION_REQUEST',
    requestType: 'CONSULTATION',
    workflowStage: 'REVISION_REQUESTED',
    availableActions: ['UPDATE_QUOTE'],
  }), 'revision');
});

test('Ready uses a fulfillment-specific next status', () => {
  assert.equal(getNextOrderStatus({ workflowStage: 'READY', deliveryType: 'Pickup' }), 'COMPLETED');
  assert.equal(getNextOrderStatus({ workflowStage: 'READY', deliveryType: 'Delivery' }), 'SHIPPING');
});

test('revision notifications preserve the Requests target and resolve their order id', () => {
  const notification = {
    type: 'ORDER_STATUS',
    relatedId: 77,
    actionUrl: '/pharmacy-page/requests?orderId=99',
  };

  assert.equal(isRevisionWorkflowNotification(notification), true);
  assert.equal(getWorkflowNotificationOrderId(notification), 77);
  assert.equal(getPharmacyNotificationTarget(notification), '/pharmacy-page/requests?orderId=99');
});

test('revision notification falls back to the target query id when relatedId is absent', () => {
  const notification = {
    type: 'ORDER_STATUS',
    actionUrl: '/pharmacy-page/requests?orderId=23',
  };

  assert.equal(getWorkflowNotificationOrderId(notification), 23);
});

test('non-revision order status notifications keep the Orders target', () => {
  const notification = {
    type: 'ORDER_STATUS',
    relatedId: 55,
    actionUrl: '/pharmacy-orders/55',
  };

  assert.equal(isRevisionWorkflowNotification(notification), false);
  assert.equal(getPharmacyNotificationTarget(notification), '/pharmacy-page/orders');
});

test('revision-requested orders remain visible in the order-list history', () => {
  assert.equal(isOrderListWorkItem({ workflowStage: 'REVISION_REQUESTED' }), true);
});
