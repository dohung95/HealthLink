export function buildPrescriptionPharmacyRequestPayload({
  patientId,
  pharmacyId,
  prescriptionHeaderId,
  fulfillmentType,
  deliveryContact,
}) {
  if (!prescriptionHeaderId) {
    throw new Error('Prescription is required for a pharmacy order request.');
  }

  return {
    patientId,
    pharmacyId,
    requestType: 'ORDER_REQUEST',
    preferredDeliveryType: fulfillmentType,
    deliveryType: fulfillmentType,
    deliveryAddress: deliveryContact?.deliveryAddress,
    deliveryLatitude: deliveryContact?.deliveryLatitude,
    deliveryLongitude: deliveryContact?.deliveryLongitude,
    deliveryPhoneNumber: deliveryContact?.deliveryPhoneNumber,
    deliveryAddressSource: deliveryContact?.deliveryAddressSource,
    prescriptionHeaderIds: [prescriptionHeaderId],
  };
}
