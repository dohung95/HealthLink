import axiosInstance from './axiosConfig';

function idempotencyKey() {
  return globalThis.crypto?.randomUUID?.()
    || `cds-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const aiCdsApi = {
  listSuggestions: async (appointmentId) => (
    await axiosInstance.get(`/api/doctor/appointments/${appointmentId}/cds-suggestions`)
  ).data,

  getDecision: async (runId) => {
    const response = await axiosInstance.get(`/api/doctor/cds-suggestions/${runId}/decision`);
    return response.status === 204 ? null : response.data;
  },

  saveDecision: async (runId, payload) => (
    await axiosInstance.post(`/api/doctor/cds-suggestions/${runId}/decision`, payload)
  ).data,

  applySuggestion: async (runId, payload) => (
    await axiosInstance.post(`/api/doctor/cds-suggestions/${runId}/apply`, payload, {
      headers: { 'Idempotency-Key': idempotencyKey() },
    })
  ).data,

  getAudit: async (runId) => (
    await axiosInstance.get(`/api/doctor/cds-suggestions/${runId}/audit`)
  ).data,
};
