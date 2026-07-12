import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeTimings,
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
