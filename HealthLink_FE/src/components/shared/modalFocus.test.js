import assert from 'node:assert/strict';
import test from 'node:test';
import { getWrappedFocusIndex } from './modalFocus.js';

test('wraps Tab from the last modal control to the first', () => {
  assert.equal(getWrappedFocusIndex(3, 2, false), 0);
  assert.equal(getWrappedFocusIndex(3, 1, false), null);
});

test('wraps Shift+Tab from the first modal control to the last', () => {
  assert.equal(getWrappedFocusIndex(3, 0, true), 2);
  assert.equal(getWrappedFocusIndex(3, 1, true), null);
});

test('uses the appropriate edge when focus is outside the modal', () => {
  assert.equal(getWrappedFocusIndex(3, -1, false), 0);
  assert.equal(getWrappedFocusIndex(3, -1, true), 2);
  assert.equal(getWrappedFocusIndex(0, -1, false), null);
});
