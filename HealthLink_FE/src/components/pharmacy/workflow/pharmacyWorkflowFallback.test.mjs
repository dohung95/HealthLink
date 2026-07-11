import assert from 'node:assert/strict';
import test from 'node:test';
import { buildFallbackRequestWorkItems } from './pharmacyWorkflowFallback.js';

test('creates an actionable fallback item for an unlinked pending consultation request', () => {
  const items = buildFallbackRequestWorkItems([
    {
      requestId: 20,
      requestType: 'CONSULTATION',
      status: 'PENDING',
      patientId: 'user-p01',
      patientName: 'Patient One',
      createdAt: '2026-07-11T11:34:16Z',
    },
  ], []);

  assert.deepEqual(items, [
    {
      caseId: 'REQ-20',
      workItemId: 'REQ-20',
      sourceType: 'CONSULTATION_REQUEST',
      requestId: 20,
      requestType: 'CONSULTATION',
      requestStatus: 'PENDING',
      workflowStage: 'NEW_REQUEST',
      availableActions: ['ACCEPT_REQUEST', 'REJECT_REQUEST'],
      patientId: 'user-p01',
      patientName: 'Patient One',
      createdAt: '2026-07-11T11:34:16Z',
      sortAt: '2026-07-11T11:34:16Z',
    },
  ]);
});

test('excludes closed, linked, and already represented requests', () => {
  const rawRequests = [
    { requestId: 1, status: 'CANCELLED' },
    { requestId: 2, status: 'PENDING', pharmacyOrderId: 99 },
    { requestId: 3, status: 'PENDING' },
  ];

  const items = buildFallbackRequestWorkItems(rawRequests, [{ requestId: 3 }]);

  assert.deepEqual(items, []);
});
