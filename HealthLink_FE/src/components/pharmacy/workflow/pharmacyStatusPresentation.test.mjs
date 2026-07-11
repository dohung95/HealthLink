import assert from 'node:assert/strict';
import test from 'node:test';
import { getOrderStatusPresentation, getRequestStatusPresentation } from './pharmacyStatusPresentation.js';

test('patient confirmation separates order state from payment state', () => {
  const presentation = getOrderStatusPresentation({ status: 'PENDING', paymentStatus: 'PENDING', requiresPatientConfirmation: true, deliveryType: 'Delivery' });
  assert.equal(presentation.order.value, 'Awaiting patient confirmation');
  assert.equal(presentation.payment.value, 'Not started');
  assert.equal(presentation.fulfillment.value, 'Delivery');
});

test('confirmed unpaid order is labelled awaiting payment', () => {
  const presentation = getOrderStatusPresentation({ status: 'CONFIRMED', paymentStatus: 'PENDING', deliveryType: 'Pickup' });
  assert.equal(presentation.order.value, 'Confirmed');
  assert.equal(presentation.payment.value, 'Awaiting payment');
});

test('quote-ready request is not rendered as its raw enum', () => {
  assert.equal(getRequestStatusPresentation({ status: 'ORDER_CREATED' }).value, 'Quote ready');
});
