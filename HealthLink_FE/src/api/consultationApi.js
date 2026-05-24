import axiosInstance from './axiosConfig';

const BASE_URL = '/api/Consultation';
const CONSULTATIONS_URL = '/api/consultations';

export const consultationApi = {
  // Get all consultations
  getAllConsultations: async () => {
    const response = await axiosInstance.get(BASE_URL);
    return response.data;
  },

  // Get consultation by ID
  getConsultationById: async (id) => {
    const response = await axiosInstance.get(`${BASE_URL}/${id}`);
    return response.data;
  },

  // Create new consultation
  createConsultation: async (consultationData) => {
    const response = await axiosInstance.post(BASE_URL, consultationData);
    return response.data;
  },

  // Update consultation
  updateConsultation: async (id, consultationData) => {
    const response = await axiosInstance.put(`${BASE_URL}/${id}`, consultationData);
    return response.data;
  },

  updateFollowUp: async (id, followUpData) => {
    const response = await axiosInstance.put(`${CONSULTATIONS_URL}/${id}/follow-up`, followUpData);
    return response.data;
  },

  cancelFollowUp: async (id) => {
    const response = await axiosInstance.put(`${CONSULTATIONS_URL}/${id}/follow-up`, {
      followUpDate: null,
      followUpNotes: null,
    });
    return response.data;
  },

  updateAppointmentFollowUp: async (appointmentId, followUpData) => {
    const response = await axiosInstance.put(`/api/appointments/${appointmentId}/follow-up`, followUpData);
    return response.data;
  },

  cancelAppointmentFollowUp: async (appointmentId) => {
    const response = await axiosInstance.put(`/api/appointments/${appointmentId}/follow-up`, {
      followUpDate: null,
      followUpNotes: null,
    });
    return response.data;
  },

  getFollowUp: async (id) => {
    const response = await axiosInstance.get(`${CONSULTATIONS_URL}/${id}/follow-up`);
    return response.data;
  },

  // Delete consultation
  deleteConsultation: async (id) => {
    const response = await axiosInstance.delete(`${BASE_URL}/${id}`);
    return response.data;
  }
};

export default consultationApi;
