import assert from 'node:assert/strict';
import test from 'node:test';
import { getNextOrderStatus, getWorkItemKind } from './pharmacyWorkflow.js';

test('consultation revision is classified as revision before consultation', () => {
  assert.equal(getWorkItemKind({
    sourceType: 'CONSULTATION_REQUEST',
    requestType: 'CONSULTATION',
    workflowStage: 'REVISION_REQUESTED',
    availableActions: ['UPDATE_QUOTE'],
  }), 'revision');
});

test('Ready uses a fulfillment-specific next status', () => {
  assert.equal(getNextOrderStatus({ workflowStage: 'READY', deliveryType: 'Pickup' }), 'COMPLETED');
  assert.equal(getNextOrderStatus({ workflowStage: 'READY', deliveryType: 'Delivery' }), 'SHIPPING');
});
