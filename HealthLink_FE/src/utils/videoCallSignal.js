const callerTypes = new Set(['doctor', 'pharmacy']);

export function toIncomingCall(signal) {
  const callerType = signal.senderRole?.trim().toLowerCase();

  return {
    callerId: signal.senderId,
    callerName: signal.senderName,
    ...(callerTypes.has(callerType) ? { callerType } : {}),
    roomId: signal.data,
  };
}
