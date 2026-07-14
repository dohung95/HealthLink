import assert from 'node:assert/strict';
import test from 'node:test';
import { getPatientPharmacyChatMode } from './pharmacy-chat-policy.js';

test('getPatientPharmacyChatMode returns editable for IN_REVIEW consultation without order', () => {
  assert.equal(getPatientPharmacyChatMode({
    request: { requestType: 'CONSULTATION', status: 'IN_REVIEW', chatRoomId: 'room-41' },
    order: null,
  }), 'editable');
});

test('getPatientPharmacyChatMode returns editable for REVISION_REQUESTED order', () => {
  assert.equal(getPatientPharmacyChatMode({
    request: { requestType: 'CONSULTATION', chatRoomId: 'room-41' },
    order: { status: 'REVISION_REQUESTED' },
  }), 'editable');
});

test('getPatientPharmacyChatMode returns readOnly for PENDING order', () => {
  assert.equal(getPatientPharmacyChatMode({
    request: { requestType: 'CONSULTATION', chatRoomId: 'room-41' },
    order: { status: 'PENDING' },
  }), 'readOnly');
});

test('getPatientPharmacyChatMode returns hidden when chatRoomId is missing', () => {
  assert.equal(getPatientPharmacyChatMode({
    request: { requestType: 'CONSULTATION', status: 'IN_REVIEW', chatRoomId: null },
    order: null,
  }), 'hidden');
});

test('getPatientPharmacyChatMode returns hidden for PENDING request without order', () => {
  assert.equal(getPatientPharmacyChatMode({
    request: { requestType: 'CONSULTATION', status: 'PENDING', chatRoomId: 'room-41' },
    order: null,
  }), 'hidden');
});

test('getPatientPharmacyChatMode returns hidden for non-consultation request', () => {
  assert.equal(getPatientPharmacyChatMode({
    request: { requestType: 'ORDER_REQUEST', status: 'IN_REVIEW', chatRoomId: 'room-41' },
    order: null,
  }), 'hidden');
});

test('getPatientPharmacyChatMode returns hidden for falsy request', () => {
  assert.equal(getPatientPharmacyChatMode({ request: null, order: null }), 'hidden');
});
