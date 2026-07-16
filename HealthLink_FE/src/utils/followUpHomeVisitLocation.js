export const FOLLOW_UP_MAP_FALLBACK_CENTER = [10.7769, 106.7009];

export function createEmptyFollowUpHomeVisitLocation() {
  return {
    visitAddress: '',
    visitCity: '',
    contactPhone: '',
    reasonForHomeVisit: '',
    specialNotes: '',
    isForSelf: true,
    receiverName: '',
    receiverAge: '',
    receiverGender: '',
    receiverRelationship: '',
    receiverPhone: '',
    visitLatitude: null,
    visitLongitude: null,
  };
}

export function hasPinnedFollowUpLocation(form) {
  return Number.isFinite(form?.visitLatitude)
    && Number.isFinite(form?.visitLongitude)
    && form.visitLatitude >= -90
    && form.visitLatitude <= 90
    && form.visitLongitude >= -180
    && form.visitLongitude <= 180;
}

export function validateFollowUpHomeVisitLocation(form) {
  const errors = {};
  if (!form?.visitAddress?.trim()) errors.visitAddress = 'Address is required.';
  if (!form?.contactPhone?.trim()) errors.contactPhone = 'Contact phone is required.';
  if (!form?.reasonForHomeVisit?.trim()) errors.reasonForHomeVisit = 'Reason is required.';
  if (!hasPinnedFollowUpLocation(form)) errors.map = 'Select the visit location on the map.';

  if (form?.isForSelf === false) {
    if (!form.receiverName?.trim()) errors.receiverName = 'Receiver name is required.';
    if (!Number(form.receiverAge) || Number(form.receiverAge) < 1) {
      errors.receiverAge = 'Receiver age is required.';
    }
    if (!form.receiverGender?.trim()) errors.receiverGender = 'Receiver gender is required.';
    if (!form.receiverRelationship?.trim()) errors.receiverRelationship = 'Relationship is required.';
    if (!form.receiverPhone?.trim()) errors.receiverPhone = 'Receiver phone is required.';
  }

  return errors;
}

export function isReusableFollowUpHomeVisitLocation(form) {
  return hasPinnedFollowUpLocation(form)
    && Object.keys(validateFollowUpHomeVisitLocation(form)).length === 0;
}
