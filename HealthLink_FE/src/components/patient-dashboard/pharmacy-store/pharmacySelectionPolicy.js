export function resolvePharmacyRevalidation(result, pharmacyId, deliveryOnly) {
  if (result == null) return { state: 'RETRY' };
  const pharmacy = result.find((candidate) => candidate.pharmacyId === pharmacyId);
  if (!pharmacy || (deliveryOnly && (!pharmacy.deliveryAvailable || pharmacy.withinDeliveryRadius === false))) {
    return { state: 'UNAVAILABLE' };
  }
  return { state: 'SELECTABLE', pharmacy };
}
