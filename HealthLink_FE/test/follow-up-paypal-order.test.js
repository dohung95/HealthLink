import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createFollowUpPayPalOrderId,
  getFollowUpPaymentErrorMessage,
} from '../src/utils/followUpPayPalOrder.js';

test('returns the backend-created PayPal order ID', async () => {
  const orderId = await createFollowUpPayPalOrderId({
    appointmentId: '52',
    createOrder: async (appointmentId) => {
      assert.equal(appointmentId, '52');
      return { orderId: 'PAYPAL-ORDER-52' };
    },
  });

  assert.equal(orderId, 'PAYPAL-ORDER-52');
});

test('rejects an empty create-order response before PayPal opens checkout', async () => {
  await assert.rejects(
    createFollowUpPayPalOrderId({
      appointmentId: '52',
      createOrder: async () => ({}),
    }),
    /did not return an order ID/,
  );
});

test('extracts the backend business message before generic fallbacks', () => {
  const error = {
    response: { data: { message: 'This address is outside our home visit service area.' } },
  };

  assert.equal(
    getFollowUpPaymentErrorMessage(error, 'Could not create PayPal order.'),
    'This address is outside our home visit service area.',
  );
});
