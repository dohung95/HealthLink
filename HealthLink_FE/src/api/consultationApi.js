import axiosInstance from './axiosConfig';

const BASE_URL = '/api/Consultation';

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

  // Delete consultation
  deleteConsultation: async (id) => {
    const response = await axiosInstance.delete(`${BASE_URL}/${id}`);
    return response.data;
  }
};

export default consultationApi;
