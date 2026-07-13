const normalize = (value) => String(value || '').trim().toUpperCase();

export function buildFallbackRequestWorkItems(rawRequests, workItems) {
  const representedRequestIds = new Set(
    (Array.isArray(workItems) ? workItems : [])
      .map((item) => Number(item?.requestId))
      .filter((requestId) => Number.isInteger(requestId) && requestId > 0),
  );

  return (Array.isArray(rawRequests) ? rawRequests : [])
    .filter((request) => {
      const requestId = Number(request?.requestId);
      return Number.isInteger(requestId)
        && requestId > 0
        && normalize(request?.status) === 'PENDING'
        && !request?.pharmacyOrderId
        && !representedRequestIds.has(requestId);
    })
    .map((request) => ({
      caseId: `REQ-${request.requestId}`,
      workItemId: `REQ-${request.requestId}`,
      sourceType: 'CONSULTATION_REQUEST',
      requestId: request.requestId,
      requestType: request.requestType || 'CONSULTATION',
      requestStatus: 'PENDING',
      workflowStage: 'NEW_REQUEST',
      availableActions: ['ACCEPT_REQUEST', 'REJECT_REQUEST'],
      patientId: request.patientId,
      patientName: request.patientName,
      createdAt: request.createdAt,
      sortAt: request.createdAt,
      ...(request.symptoms ? { symptoms: request.symptoms } : {}),
      ...(request.description ? { description: request.description } : {}),
      ...(request.deliveryType ? { deliveryType: request.deliveryType } : {}),
      ...(request.deliveryAddress ? { deliveryAddress: request.deliveryAddress } : {}),
      ...(request.deliveryPhoneNumber ? { deliveryPhoneNumber: request.deliveryPhoneNumber } : {}),
    }));
}
