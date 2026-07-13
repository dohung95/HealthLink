import assert from 'node:assert/strict';
import test from 'node:test';
import { getWorkflowNotificationTarget } from './notificationToastPolicy.js';

test('NEW_ORDER targets the current role safely', () => {
  const notification = { type: 'NEW_ORDER', relatedId: 500, actionUrl: '/pharmacy-orders/500' };

  assert.equal(
    getWorkflowNotificationTarget(notification, 'patient'),
    '/patient-dashboard/pharmacy/orders/500',
  );
  assert.equal(getWorkflowNotificationTarget(notification, 'pharmacy'), '/pharmacy-page/orders');
});

test('pharmacy accepts its revision request target but patient falls back to own order', () => {
  const notification = {
    type: 'ORDER_STATUS',
    relatedId: 11,
    actionUrl: '/pharmacy-page/requests?orderId=11',
  };

  assert.equal(
    getWorkflowNotificationTarget(notification, 'pharmacy'),
    '/pharmacy-page/requests?orderId=11',
  );
  assert.equal(
    getWorkflowNotificationTarget(notification, 'patient'),
    '/patient-dashboard/pharmacy/orders/11',
  );
});
