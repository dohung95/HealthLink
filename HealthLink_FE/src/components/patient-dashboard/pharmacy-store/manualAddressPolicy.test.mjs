import test from 'node:test';
import assert from 'node:assert/strict';

import { applyManualGeocodeResult } from './manualAddressPolicy.js';

test('preserves the trimmed patient address when provider formatting has a wrong suffix', () => {
  const result = applyManualGeocodeResult('  chợ bến thành  ', {
    formattedAddress: 'Chợ Bến Thành, Quận 1, Thành phố Thủ Đức, 71009, Việt Nam',
    latitude: 10.772,
    longitude: 106.6983,
    provider: 'GEOAPIFY',
  });

  assert.deepEqual(result, {
    address: 'chợ bến thành',
    latitude: 10.772,
    longitude: 106.6983,
    provider: 'GEOAPIFY',
  });
});

test('rejects non-finite provider coordinates', () => {
  assert.throws(
    () => applyManualGeocodeResult('chợ bến thành', { latitude: 'unknown', longitude: 106.6983 }),
    /valid coordinates/i,
  );
});
