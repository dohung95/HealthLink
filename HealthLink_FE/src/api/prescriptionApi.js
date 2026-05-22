import axiosInstance from './axiosConfig';
import { normalizePrescription } from './normalizers';

const getCurrentUserId = () => localStorage.getItem('userId');

export const prescriptionService = {
  createPrescription: async (prescriptionData) => {
    const response = await axiosInstance.post('/api/prescriptions', prescriptionData);
    return normalizePrescription(response.data);
  },

  getPrescriptionHeader: async (prescriptionId) => {
    const response = await axiosInstance.get(`/api/prescriptions/${prescriptionId}`);
    return normalizePrescription(response.data);
  },

  getMyPrescriptions: async () => {
    const userId = getCurrentUserId();
    if (!userId) {
      return [];
    }

    const response = await axiosInstance.get(`/api/prescriptions/patient/${userId}`);
    return (response.data || []).map(normalizePrescription);
  },

  getPrescriptionById: async (id) => {
    const response = await axiosInstance.get(`/api/prescriptions/${id}`);
    return normalizePrescription(response.data);
  },

  getByAppointment: async (appointmentId, options = {}) => {
    const doctorId = options.doctorId;
    const patientId = options.patientId;

    if (doctorId) {
      const response = await axiosInstance.get(`/api/prescriptions/doctor/${doctorId}`);
      const prescriptions = (response.data || []).map(normalizePrescription);
      return prescriptions.find((item) => item.appointmentId === appointmentId) ?? null;
    }

    if (patientId) {
      const response = await axiosInstance.get(`/api/prescriptions/patient/${patientId}`);
      const prescriptions = (response.data || []).map(normalizePrescription);
      return prescriptions.find((item) => item.appointmentId === appointmentId) ?? null;
    }

    return null;
  },

  updatePrescription: async (id, prescriptionData) => {
    throw new Error(`Updating prescription ${id} is not supported by the current backend API.`);
  },

  deletePrescription: async (id) => {
    throw new Error(`Deleting prescription ${id} is not supported by the current backend API.`);
  },
};

export default prescriptionService;
