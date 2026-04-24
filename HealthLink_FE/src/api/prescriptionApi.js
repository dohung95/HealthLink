import axios from 'axios';


const API_URL = 'https://localhost:7267/api';

// Helper to get auth header
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

export const prescriptionService = {
  // Create new prescription (Doctor only)
  createPrescription: async (prescriptionData) => {
    const response = await axios.post(`${API_URL}/Prescription/create`, prescriptionData, getAuthHeader());
    return response.data;
  },

  // Get prescription header with items
  getPrescriptionHeader: async (headerId) => {
    const response = await axios.get(`${API_URL}/Prescription/header/${headerId}`, getAuthHeader());
    return response.data;
  },

 
  

  // Get my prescriptions (current patient only)
  getMyPrescriptions: async () => {
    const response = await axios.get(`${API_URL}/Prescription/mine`, getAuthHeader());
    return response.data;
  },

  // Get prescription by id (if needed)
  getPrescriptionById: async (id) => {
    const response = await axios.get(`${API_URL}/Prescription/${id}`, getAuthHeader());
    return response.data;
  },

  // Get prescription by appointment ID
  getByAppointment: async (appointmentId) => {
    const response = await axios.get(`${API_URL}/Prescription`, getAuthHeader());
    const prescriptions = response.data;
    return prescriptions.find(p => p.appointmentID === appointmentId);
  },

  // Update prescription
  updatePrescription: async (id, prescriptionData) => {
    const response = await axios.put(`${API_URL}/Prescription/header/${id}`, prescriptionData, getAuthHeader());
    return response.data;
  },

  // Delete prescription item (not the whole prescription)
  deletePrescription: async (id) => {
    const response = await axios.delete(`${API_URL}/Prescription/header/${id}`, getAuthHeader());
    return response.data;
  }
};

export default prescriptionService;