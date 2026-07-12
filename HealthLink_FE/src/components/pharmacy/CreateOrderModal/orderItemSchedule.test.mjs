import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FREQUENCY_OPTIONS,
  getFrequencyOptions,
  normalizeTimings,
  serializeFrequency,
  serializeTimings,
  toggleTiming,
} from './orderItemSchedule.js';

test('normalizes duplicate timing values while preserving their first-seen order', () => {
  assert.deepEqual(
    normalizeTimings('MORNING, EVENING, MORNING'),
    ['MORNING', 'EVENING'],
  );
});

test('toggles a timing without changing the order of the remaining timings', () => {
  assert.deepEqual(
    toggleTiming('MORNING,AFTERNOON,EVENING', 'AFTERNOON'),
    ['MORNING', 'EVENING'],
  );
});

test('serializes selected timings as a comma-separated payload value', () => {
  assert.equal(serializeTimings(['MORNING', 'EVENING']), 'MORNING,EVENING');
});

test('normalizing timings leaves frequency data untouched', () => {
  const item = { frequency: 'Twice daily', timing: 'MORNING, MORNING' };

  assert.deepEqual(
    { ...item, timing: serializeTimings(normalizeTimings(item.timing)) },
    { frequency: 'Twice daily', timing: 'MORNING' },
  );
});

test('uses doctor frequency codes and labels so prescription BID remains selected', () => {
  assert.deepEqual(FREQUENCY_OPTIONS, [
    { value: 'QD', label: 'QD (1x daily)' },
    { value: 'BID', label: 'BID (2x daily)' },
    { value: 'TID', label: 'TID (3x daily)' },
    { value: 'QID', label: 'QID (4x daily)' },
  ]);
  assert.deepEqual(getFrequencyOptions('BID'), FREQUENCY_OPTIONS);
});

test('preserves legacy frequency values for display and payload compatibility', () => {
  assert.deepEqual(getFrequencyOptions('Twice daily').at(-1), {
    value: 'Twice daily',
    label: 'Twice daily',
  });
  assert.equal(serializeFrequency('BID'), 'BID');
  assert.equal(serializeFrequency('Twice daily'), 'Twice daily');
});
