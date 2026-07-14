import assert from 'node:assert/strict';
import test from 'node:test';
import { toIncomingCall } from './videoCallSignal.js';

test('marks a PHARMACY CALL_REQUEST as a pharmacy caller', () => {
  assert.deepEqual(
    toIncomingCall({
      senderId: 'pharmacy-user-1',
      senderName: 'Central Pharmacy',
      senderRole: 'PHARMACY',
      data: 'pharmacy-room-1',
    }),
    {
      callerId: 'pharmacy-user-1',
      callerName: 'Central Pharmacy',
      callerType: 'pharmacy',
      roomId: 'pharmacy-room-1',
    },
  );
});

test('preserves doctor and legacy call behavior', () => {
  assert.deepEqual(
    toIncomingCall({
      senderId: 'doctor-user-1',
      senderName: 'Dr. Nguyen',
      senderRole: 'DOCTOR',
      data: 'doctor-room-1',
    }),
    {
      callerId: 'doctor-user-1',
      callerName: 'Dr. Nguyen',
      callerType: 'doctor',
      roomId: 'doctor-room-1',
    },
  );

  assert.deepEqual(
    toIncomingCall({
      senderId: 'legacy-doctor',
      senderName: 'Dr. Legacy',
      data: 'legacy-room',
    }),
    {
      callerId: 'legacy-doctor',
      callerName: 'Dr. Legacy',
      roomId: 'legacy-room',
    },
  );
});
