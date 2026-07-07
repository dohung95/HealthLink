import axiosInstance from './axiosConfig';

const appendIfPresent = (formData, key, value) => {
  if (value !== undefined && value !== null && value !== '') {
    formData.append(key, value);
  }
};

const toFormData = (payload = {}) => {
  const formData = new FormData();
  [
    'category',
    'description',
    'testName',
    'testResults',
    'resultUnit',
    'referenceRange',
    'testStatus',
    'clinicalStatus',
    'documentDate',
    'performedBy',
    'labFacilityName',
    'sentToLabAt',
    'resultReceivedAt',
    'publishNow',
    'structuredResultsJson',
    'doctorAssessment',
    'patientSummary',

  ].forEach((key) => appendIfPresent(formData, key, payload[key]));

  if (payload.file) {
    formData.append('file', payload.file);
  }

  return formData;
};

export const doctorClinicalResultApi = {
  getAppointmentResults: async (appointmentId) => {
    const response = await axiosInstance.get(`/api/doctor/appointments/${appointmentId}/clinical-results`);
    return response.data;
  },

  createResult: async (appointmentId, payload) => {
    const response = await axiosInstance.post(
      `/api/doctor/appointments/${appointmentId}/clinical-results`,
      toFormData(payload),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },

  updateResult: async (documentId, payload) => {
    const response = await axiosInstance.put(
      `/api/doctor/clinical-results/${documentId}`,
      toFormData(payload),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },

  publishResult: async (documentId) => {
    const response = await axiosInstance.post(`/api/doctor/clinical-results/${documentId}/publish`);
    return response.data;
  },

  deleteResult: async (documentId) => {
    await axiosInstance.delete(`/api/doctor/clinical-results/${documentId}`);
  },
};
