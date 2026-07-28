import axiosInstance from './axiosConfig';

export const aiClinicalContextApi = {
  get: async (appointmentId) => (
    await axiosInstance.get(`/api/doctor/appointments/${appointmentId}/clinical-context`)
  ).data,
  update: async (appointmentId, payload) => (
    await axiosInstance.put(`/api/doctor/appointments/${appointmentId}/clinical-context`, payload)
  ).data,
  createSnapshot: async (appointmentId, payload) => (
    await axiosInstance.post(
      `/api/doctor/appointments/${appointmentId}/clinical-context/snapshots`,
      payload,
    )
  ).data,
};
