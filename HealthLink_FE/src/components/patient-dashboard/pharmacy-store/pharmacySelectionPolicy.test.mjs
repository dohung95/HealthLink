import assert from 'node:assert/strict';
import test from 'node:test';
import { resolvePharmacyRevalidation } from './pharmacySelectionPolicy.js';

test('a recommendation refresh failure is retryable', () => {
  assert.deepEqual(resolvePharmacyRevalidation(null, 'pharmacy-1', true), { state: 'RETRY' });
});

test('an absent pharmacy after a successful refresh is unavailable', () => {
  assert.deepEqual(resolvePharmacyRevalidation([], 'pharmacy-1', false), { state: 'UNAVAILABLE' });
});

test('an eligible refreshed pharmacy remains selectable', () => {
  const pharmacy = { pharmacyId: 'pharmacy-1', deliveryAvailable: true, withinDeliveryRadius: true };
  assert.deepEqual(resolvePharmacyRevalidation([pharmacy], 'pharmacy-1', true), { state: 'SELECTABLE', pharmacy });
});
