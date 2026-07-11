import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canEditDeliveryAddress,
  canEditDeliveryPhone,
  isDeliveryContactLocked,
} from './deliveryContactPolicy.js';

const deliveryOrder = (status, paymentStatus = 'PENDING') => ({
  deliveryType: 'Delivery',
  status,
  paymentStatus,
});

test('allows an unpaid delivery order to request an address change', () => {
  assert.equal(canEditDeliveryAddress(deliveryOrder('PENDING')), true);
  assert.equal(canEditDeliveryAddress(deliveryOrder('CONFIRMED')), true);
});

test('keeps phone edits available through ready but locks all contact edits at shipping', () => {
  assert.equal(canEditDeliveryPhone(deliveryOrder('READY', 'PAID')), true);
  assert.equal(canEditDeliveryAddress(deliveryOrder('READY')), false);
  assert.equal(isDeliveryContactLocked(deliveryOrder('SHIPPING')), true);
});

test('does not expose delivery-contact editing for pickup orders', () => {
  const pickup = { deliveryType: 'Pickup', status: 'PENDING', paymentStatus: 'PENDING' };
  assert.equal(canEditDeliveryAddress(pickup), false);
  assert.equal(canEditDeliveryPhone(pickup), false);
});
