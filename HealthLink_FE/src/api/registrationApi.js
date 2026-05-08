import axios from 'axios';

// Backend Spring Boot runs on http://localhost:8096
const API_BASE_URL = 'http://localhost:8096/api/registration';

// Create axios instance for public registration (no auth required)
const registrationApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const registrationService = {
  // Submit doctor registration
  submitDoctorRegistration: async (data) => {
    const response = await registrationApi.post('/doctor', data);
    return response.data;
  },

  // Submit pharmacy registration
  submitPharmacyRegistration: async (data) => {
    const response = await registrationApi.post('/pharmacy', data);
    return response.data;
  },

  // Get active specialties for doctor registration form
  getSpecialties: async () => {
    const response = await registrationApi.get('/specialties');
    return response.data;
  }
};

export default registrationService;
