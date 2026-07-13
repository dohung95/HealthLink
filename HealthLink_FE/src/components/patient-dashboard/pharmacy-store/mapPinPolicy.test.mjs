import assert from 'node:assert/strict';
import test from 'node:test';
import { applyMapPin, clearAddressVerification } from './mapPinPolicy.js';

test('map pin preserves patient-entered address and makes delivery location submittable', () => {
  const result = applyMapPin({ address: '12 Nguyễn Huệ', source: 'MANUAL', verified: false }, 10.77, 106.70);

  assert.deepEqual(result, {
    address: '12 Nguyễn Huệ', latitude: 10.77, longitude: 106.70, source: 'MAP_PIN', verified: true,
  });
});

test('editing an address clears prior coordinates and verification', () => {
  assert.deepEqual(clearAddressVerification({ address: '12 Nguyễn Huệ', latitude: 10.77, longitude: 106.70, source: 'MAP_PIN', verified: true }, '13 Nguyễn Huệ'), {
    address: '13 Nguyễn Huệ', latitude: null, longitude: null, source: 'MANUAL', verified: false,
  });
});
