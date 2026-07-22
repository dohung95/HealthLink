import axiosInstance from './axiosConfig';

export const aiLabReportApi = {
  upload: async (appointmentId, file, metadata = {}) => {
    const body = new FormData();
    body.append('file', file);
    if (metadata.documentDate) body.append('documentDate', metadata.documentDate);
    if (metadata.labFacilityName) body.append('labFacilityName', metadata.labFacilityName);
    const response = await axiosInstance.post(`/api/doctor/appointments/${appointmentId}/lab-reports`, body, {
      headers: { 'Content-Type': 'multipart/form-data', 'Idempotency-Key': crypto.randomUUID() },
    });
    return response.data;
  },
  list: async (appointmentId) => (await axiosInstance.get(`/api/doctor/appointments/${appointmentId}/lab-reports`)).data,
  getVerification: async (reportId) => (await axiosInstance.get(`/api/doctor/lab-reports/${reportId}/verification`)).data,
  updateObservation: async (reportId, observationId, payload) => (await axiosInstance.put(`/api/doctor/lab-reports/${reportId}/observations/${observationId}`, payload)).data,
  verify: async (reportId, payload) => (await axiosInstance.post(`/api/doctor/lab-reports/${reportId}/verify`, payload)).data,
  reprocess: async (reportId) => (await axiosInstance.post(`/api/doctor/lab-reports/${reportId}/reprocess`)).data,
  getFile: async (reportId) => (await axiosInstance.get(`/api/doctor/lab-reports/${reportId}/file`, { responseType: 'blob' })).data,
};
