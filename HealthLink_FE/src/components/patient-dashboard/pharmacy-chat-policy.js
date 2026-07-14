export function getPatientPharmacyChatMode({ request, order } = {}) {
  if (!request || request.requestType !== 'CONSULTATION') return 'hidden';
  if (!request.chatRoomId) return 'hidden';

  const requestStatus = (request.status || request.requestStatus || '').toUpperCase();
  const orderStatus = (order?.status || order?.orderStatus || '').toUpperCase();

  if (!order) {
    return requestStatus === 'IN_REVIEW' ? 'editable' : 'hidden';
  }

  if (orderStatus === 'REVISION_REQUESTED') return 'editable';
  if (orderStatus) return 'readOnly';

  return 'hidden';
}
