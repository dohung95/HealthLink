const STORAGE_PREFIX = 'healthlink:follow-up-homevisit-access:';
const DEFAULT_TTL_MS = 10 * 60 * 1000;

const keyFor = (appointmentId) => `${STORAGE_PREFIX}${String(appointmentId || '').trim()}`;

const canUseSessionStorage = () => {
  try {
    return typeof window !== 'undefined' && Boolean(window.sessionStorage);
  } catch {
    return false;
  }
};

export const grantFollowUpHomeVisitAccess = (appointmentId, metadata = {}, ttlMs = DEFAULT_TTL_MS) => {
  if (!appointmentId || !canUseSessionStorage()) return null;

  const payload = {
    appointmentId: String(appointmentId),
    source: 'follow-up-confirm-modal',
    grantedAt: Date.now(),
    expiresAt: Date.now() + ttlMs,
    metadata,
  };

  sessionStorage.setItem(keyFor(appointmentId), JSON.stringify(payload));
  return payload;
};

export const readFollowUpHomeVisitAccess = (appointmentId) => {
  if (!appointmentId || !canUseSessionStorage()) return null;

  const raw = sessionStorage.getItem(keyFor(appointmentId));
  if (!raw) return null;

  try {
    const payload = JSON.parse(raw);
    if (!payload?.expiresAt || payload.expiresAt < Date.now()) {
      sessionStorage.removeItem(keyFor(appointmentId));
      return null;
    }
    return payload;
  } catch {
    sessionStorage.removeItem(keyFor(appointmentId));
    return null;
  }
};

export const hasFollowUpHomeVisitAccess = (appointmentId) => (
  Boolean(readFollowUpHomeVisitAccess(appointmentId))
);

export const clearFollowUpHomeVisitAccess = (appointmentId) => {
  if (!appointmentId || !canUseSessionStorage()) return;
  sessionStorage.removeItem(keyFor(appointmentId));
};
