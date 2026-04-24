import axios from 'axios';

const API_BASE_URL = 'https://localhost:7267/api/admin';

// Create axios instance
const adminApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
adminApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle responses and errors
adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or unauthorized
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ==================== PATIENTS API ====================

export const patientsApi = {
  getAll: async (params = {}) => {
    const { pageNumber = 1, pageSize = 10, searchTerm = '', status = '', sortBy = 'newest' } = params;
    const response = await adminApi.get('/adminpatients', {
      params: { pageNumber, pageSize, searchTerm, status, sortBy }
    });
    return response.data;
  },

  getById: async (id) => {
    const response = await adminApi.get(`/adminpatients/${id}`);
    return response.data;
  },

  update: async (id, data) => {
    const response = await adminApi.put(`/adminpatients/${id}`, data);
    return response.data;
  },

  updateStatus: async (id, status) => {
    const response = await adminApi.put(`/adminpatients/${id}/status`, { status });
    return response.data;
  }
};

// ==================== DOCTORS API ====================

export const doctorsApi = {
  getAll: async (params = {}) => {
    const { pageNumber = 1, pageSize = 10, searchTerm = '', status = '', specialty = '', sortBy = 'newest' } = params;
    const response = await adminApi.get('/admindoctors', {
      params: { pageNumber, pageSize, searchTerm, status, specialty, sortBy }
    });
    return response.data;
  },

  getById: async (id) => {
    const response = await adminApi.get(`/admindoctors/${id}`);
    return response.data;
  },

  update: async (id, data) => {
    const response = await adminApi.put(`/admindoctors/${id}`, data);
    return response.data;
  },

  create: async (data) => {
    const response = await adminApi.post('/admindoctors', data);
    return response.data;
  },

  updateStatus: async (id, status) => {
    const response = await adminApi.put(`/admindoctors/${id}/status`, { status });
    return response.data;
  },

  delete: async (id) => {
    const response = await adminApi.delete(`/admindoctors/${id}`);
    return response.data;
  }
};

// ==================== APPOINTMENTS API ====================

export const appointmentsApi = {
  getStats: async () => {
    const response = await adminApi.get('/adminappointments/stats');
    return response.data;
  },

  getAll: async (params = {}) => {
    const { pageNumber = 1, pageSize = 10, searchTerm = '', date = null, status = '', department = '' } = params;
    const response = await adminApi.get('/adminappointments', {
      params: { pageNumber, pageSize, searchTerm, date, status, department }
    });
    return response.data;
  },

  getById: async (id) => {
    const response = await adminApi.get(`/adminappointments/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await adminApi.post('/adminappointments', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await adminApi.put(`/adminappointments/${id}`, data);
    return response.data;
  }
};

// ==================== MEDICAL RECORDS API ====================

export const medicalRecordsApi = {
  getStats: async () => {
    const response = await adminApi.get('/adminmedicalrecords/stats');
    return response.data;
  },

  getAll: async (params = {}) => {
    const { pageNumber = 1, pageSize = 10, searchTerm = '', fromDate = null, toDate = null, category = '' } = params;
    const response = await adminApi.get('/adminmedicalrecords', {
      params: { pageNumber, pageSize, searchTerm, fromDate, toDate, category }
    });
    return response.data;
  },

  getById: async (id) => {
    const response = await adminApi.get(`/adminmedicalrecords/${id}`);
    return response.data;
  },

  getByPatientId: async (patientId) => {
    const response = await adminApi.get(`/adminmedicalrecords/patient/${patientId}`);
    return response.data;
  },

  // New: Get patient list for patient-centric view
  getPatients: async (params = {}) => {
    const { pageNumber = 1, pageSize = 10, searchTerm = '' } = params;
    const response = await adminApi.get('/adminmedicalrecords/patients', {
      params: { pageNumber, pageSize, searchTerm }
    });
    return response.data;
  },

  // New: Get comprehensive patient medical history
  getPatientMedicalHistory: async (patientId) => {
    const response = await adminApi.get(`/adminmedicalrecords/patient/${patientId}/details`);
    return response.data;
  }
};

// ==================== ANALYTICS API ====================

export const analyticsApi = {
  getPatientRegistrations: async (year = 0) => {
    const response = await adminApi.get('/analytics/patient-registrations', {
      params: { year }
    });
    return response.data;
  },

  getAppointmentsByWeek: async (year = 0, month = 0) => {
    const response = await adminApi.get('/analytics/appointments-by-week', {
      params: { year, month }
    });
    return response.data;
  },

  getAppointmentsByMonth: async (year = 0) => {
    const response = await adminApi.get('/analytics/appointments-by-month', {
      params: { year }
    });
    return response.data;
  },

  getRevenueByMonth: async (year = 0) => {
    const response = await adminApi.get('/analytics/revenue-by-month', {
      params: { year }
    });
    return response.data;
  }
};

export default adminApi;
