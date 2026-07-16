import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPrescriptionPharmacyRequestPayload } from '../src/components/patient-dashboard/pharmacy-order-request.js';

test('builds an ORDER_REQUEST with exactly the selected prescription', () => {
  const payload = buildPrescriptionPharmacyRequestPayload({
    patientId: 'patient-1',
    pharmacyId: 'pharmacy-1',
    prescriptionHeaderId: 42,
    fulfillmentType: 'Delivery',
    deliveryContact: {
      deliveryAddress: '12 Le Loi',
      deliveryLatitude: 10.77,
      deliveryLongitude: 106.70,
      deliveryPhoneNumber: '0900000000',
      deliveryAddressSource: 'MAP_PIN',
    },
  });

  assert.equal(payload.requestType, 'ORDER_REQUEST');
  assert.deepEqual(payload.prescriptionHeaderIds, [42]);
  assert.equal(payload.patientId, 'patient-1');
  assert.equal(payload.pharmacyId, 'pharmacy-1');
  assert.equal(payload.deliveryType, 'Delivery');
});

test('rejects a request without a prescription', () => {
  assert.throws(
    () => buildPrescriptionPharmacyRequestPayload({
      patientId: 'patient-1',
      pharmacyId: 'pharmacy-1',
      prescriptionHeaderId: null,
      fulfillmentType: 'Pickup',
      deliveryContact: {},
    }),
    /Prescription is required/,
  );
});
