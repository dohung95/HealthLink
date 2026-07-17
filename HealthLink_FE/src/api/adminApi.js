import axios from 'axios';

// Backend Spring Boot admin API base URL
const API_BASE_URL = import.meta.env.VITE_SPRING_API_BASE_URL || 'http://localhost:8096';
const API_URL = `${API_BASE_URL}/api/admin`;

// Create axios instance
const adminApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
adminApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
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
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Token expired, unauthorized, or forbidden
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
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

  updateStatus: async (id, status, reason = '') => {
    const response = await adminApi.put(`/adminpatients/${id}/status`, { status, reason });
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

  updateStatus: async (id, status, reason = '') => {
    const response = await adminApi.put(`/admindoctors/${id}/status`, { status, reason });
    return response.data;
  },

  delete: async (id) => {
    const response = await adminApi.delete(`/admindoctors/${id}`);
    return response.data;
  },

  requestPaypalEmailChange: async (id, newPaypalEmail, reason) => {
    const response = await adminApi.put(`/admindoctors/${id}/paypal-email/request`, { newPaypalEmail, reason });
    return response.data;
  },

  verifyPaypalEmailChange: async (id, otp, reason) => {
    const response = await adminApi.put(`/admindoctors/${id}/paypal-email/verify`, { otp, reason });
    return response.data;
  },

  /**
   * Lấy danh sách bác sĩ có lịch làm việc vào ngày cụ thể.
   * @param {string} date - Ngày cần kiểm tra (format: yyyy-MM-dd)
   * @param {string} specialty - Chuyên khoa (optional)
   * @param {string} excludeDoctorId - ID bác sĩ cần loại trừ (optional)
   * @returns {Promise<Array>} Danh sách bác sĩ available
   */
  getAvailableOnDate: async (date, specialty = '', excludeDoctorId = '') => {
    const response = await adminApi.get('/admindoctors/available-on-date', {
      params: { date, specialty, excludeDoctorId }
    });
    return response.data;
  },

  /**
   * Lấy danh sách specialties từ database.
   * Dùng cho filter và edit form.
   * @returns {Promise<Array>} Danh sách specialties [{specialtyId, name}, ...]
   */
  getSpecialties: async () => {
    // Sử dụng public API registration/specialties
    const response = await axios.get(`${API_BASE_URL}/api/registration/specialties`);
    return response.data;
  }
};

// ==================== PHARMACIES API ====================

export const pharmaciesApi = {
  getAll: async (params = {}) => {
    const { pageNumber = 1, pageSize = 10, searchTerm = '', status = '', city = '', verified = '', sortBy = 'newest' } = params;
    const response = await adminApi.get('/adminpharmacies', {
      params: { pageNumber, pageSize, searchTerm, status, city, verified, sortBy }
    });
    return response.data;
  },

  getById: async (id) => {
    const response = await adminApi.get(`/adminpharmacies/${id}`);
    return response.data;
  },

  update: async (id, data) => {
    const response = await adminApi.put(`/adminpharmacies/${id}`, data);
    return response.data;
  },

  updateStatus: async (id, status, reason = '') => {
    const response = await adminApi.put(`/adminpharmacies/${id}/status`, { status, reason });
    return response.data;
  },

  updateVerification: async (id, verified) => {
    const response = await adminApi.put(`/adminpharmacies/${id}/verify`, { verified });
    return response.data;
  },

  requestPaypalEmailChange: async (id, newPaypalEmail, reason) => {
    const response = await adminApi.put(`/adminpharmacies/${id}/paypal-email/request`, { newPaypalEmail, reason });
    return response.data;
  },

  verifyPaypalEmailChange: async (id, otp, reason) => {
    const response = await adminApi.put(`/adminpharmacies/${id}/paypal-email/verify`, { otp, reason });
    return response.data;
  },

  delete: async (id) => {
    const response = await adminApi.delete(`/adminpharmacies/${id}`);
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
    const {
      pageNumber = 1, pageSize = 10, searchTerm = '', date = null,
      startDate = null, endDate = null, status = '', department = ''
    } = params;
    const response = await adminApi.get('/adminappointments', {
      params: { pageNumber, pageSize, searchTerm, date, startDate, endDate, status, department }
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
  },

  /**
   * Admin chuyển appointment sang bác sĩ khác.
   * @param {number} id - Appointment ID
   * @param {object} data - { newDoctorId, reason, newAppointmentTime?, notifyPatient?, notifyOldDoctor?, notifyNewDoctor? }
   */
  reassign: async (id, data) => {
    const response = await adminApi.put(`/adminappointments/${id}/reassign`, data);
    return response.data;
  },

  /**
   * Admin hủy appointment.
   * @param {number} id - Appointment ID
   * @param {object} data - { reason, notifyPatient?, notifyDoctor?, processRefund? }
   */
  cancel: async (id, data) => {
    const response = await adminApi.put(`/adminappointments/${id}/cancel`, data);
    return response.data;
  },

  /**
   * Admin cancels an appointment because the assigned doctor is unavailable (Home Visit / patient
   * manually selected their doctor - reassigning directly is not allowed). Automatically refunds
   * and sends the patient a rebook link.
   * @param {number} id - Appointment ID
   * @param {string} reason
   */
  cancelDueToDoctorUnavailable: async (id, reason) => {
    const response = await adminApi.put(`/adminappointments/${id}/cancel-doctor-unavailable`, { reason });
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
  },

  getAppointmentsByMonthSplit: async (year = 0) => {
    const response = await adminApi.get('/analytics/appointments-by-month-split', {
      params: { year }
    });
    return response.data;
  },

  getRevenueByMonthSplit: async (year = 0) => {
    const response = await adminApi.get('/analytics/revenue-by-month-split', {
      params: { year }
    });
    return response.data;
  },

  getRegistrationsByRole: async (year = 0) => {
    const response = await adminApi.get('/analytics/registrations-by-role', {
      params: { year }
    });
    return response.data;
  },

  getPatientRegistrationsByWeek: async (year = 0, month = 0) => {
    const response = await adminApi.get('/analytics/patient-registrations-by-week', {
      params: { year, month }
    });
    return response.data;
  },

  getAppointmentsByWeekSplit: async (year = 0, month = 0) => {
    const response = await adminApi.get('/analytics/appointments-by-week-split', {
      params: { year, month }
    });
    return response.data;
  },

  getRevenueByWeekSplit: async (year = 0, month = 0) => {
    const response = await adminApi.get('/analytics/revenue-by-week-split', {
      params: { year, month }
    });
    return response.data;
  },

  getRegistrationsByWeekRole: async (year = 0, month = 0) => {
    const response = await adminApi.get('/analytics/registrations-by-week-role', {
      params: { year, month }
    });
    return response.data;
  },

  getAppointmentsByHourSplit: async (year = 0, month = 0) => {
    const response = await adminApi.get('/analytics/appointments-by-hour-split', {
      params: { year, month }
    });
    return response.data;
  },

  /**
   * @param {number} year - 0 = all-time (default); >0 = scope to that year
   * @param {number} month - 0 = whole year (when year>0); 1-12 = scope to that month
   */
  getOverviewStats: async (year = 0, month = 0) => {
    const response = await adminApi.get('/analytics/overview-stats', { params: { year, month } });
    return response.data;
  }
};

// ==================== COMMISSION API ====================

export const commissionApi = {
  getDashboard: async () => {
    const response = await adminApi.get('/commission/dashboard');
    return response.data;
  },

  getDashboardMonthly: async (year) => {
    const response = await adminApi.get('/commission/dashboard/monthly', { params: { year } });
    return response.data;
  },

  getConfigs: async () => {
    const response = await adminApi.get('/commission/configs');
    return response.data;
  },

  getConfigById: async (id) => {
    const response = await adminApi.get(`/commission/configs/${id}`);
    return response.data;
  },

  updateConfig: async (id, data) => {
    const response = await adminApi.put(`/commission/configs/${id}`, data);
    return response.data;
  },

  getTransactions: async (params = {}) => {
    const {
      pageNumber = 1,
      pageSize = 10,
      searchTerm = '',
      recipientType = '',
      status = '',
      serviceType = '',
      fromDate = null,
      toDate = null
    } = params;
    const response = await adminApi.get('/commission/transactions', {
      params: {
        page: pageNumber - 1,
        size: pageSize,
        recipientId: searchTerm,
        recipientType,
        status,
        serviceType,
        fromDate,
        toDate
      }
    });
    return response.data;
  },

  getSettlements: async (params = {}) => {
    const { pageNumber = 1, pageSize = 10, status = '' } = params;
    const response = await adminApi.get('/commission/settlements', {
      params: { page: pageNumber - 1, size: pageSize, status }
    });
    return response.data;
  },

  // Partner Commission Management
  getPartners: async (params = {}) => {
    const { type = 'DOCTOR', searchTerm = '', pageNumber = 1, pageSize = 10 } = params;
    const response = await adminApi.get('/commission/partners', {
      params: { type, searchTerm, page: pageNumber - 1, size: pageSize }
    });
    return response.data;
  },

  getPartner: async (type, id) => {
    const response = await adminApi.get(`/commission/partners/${type}/${id}`);
    return response.data;
  },

  getPartnerHistory: async (type, id) => {
    const response = await adminApi.get(`/commission/partners/${type}/${id}/history`);
    return response.data;
  },

  updatePartnerCommission: async (type, id, data) => {
    const response = await adminApi.put(`/commission/partners/${type}/${id}`, data);
    return response.data;
  },

  removePartnerCustomRate: async (type, id, reason = '') => {
    const response = await adminApi.delete(`/commission/partners/${type}/${id}/custom-rate`, {
      data: { reason }
    });
    return response.data;
  }
};

// ==================== FINANCIAL API ====================

export const financialApi = {
  /**
   * @param {number} year - 0 = all-time (default); >0 = scope to that year
   * @param {number} month - 0 = whole year (when year>0); 1-12 = scope to that month
   */
  getOverview: async (year = 0, month = 0) => {
    const response = await adminApi.get('/financial/overview', { params: { year, month } });
    return response.data;
  },

  getTransactions: async (params = {}) => {
    const {
      pageNumber = 1,
      pageSize = 10,
      status = '',
      transactionType = '',
      fromDate = null,
      toDate = null,
      searchTerm = ''
    } = params;
    const response = await adminApi.get('/financial/transactions', {
      params: { pageNumber, pageSize, status, transactionType, fromDate, toDate, searchTerm }
    });
    return response.data;
  },

  getRevenueByDay: async (year = 0, month = 0) => {
    const response = await adminApi.get('/financial/revenue-by-day', {
      params: { year, month }
    });
    return response.data;
  },

  getRevenueByWeek: async (year = 0, month = 0) => {
    const response = await adminApi.get('/financial/revenue-by-week', {
      params: { year, month }
    });
    return response.data;
  }
};

// ==================== REGISTRATIONS API ====================

export const registrationsApi = {
  getAll: async (params = {}) => {
    const { pageNumber = 1, pageSize = 10, type = '', status = '', sortBy = 'newest' } = params;
    const response = await adminApi.get('/registrations', {
      params: { pageNumber, pageSize, type, status, sortBy }
    });
    return response.data;
  },

  getById: async (id) => {
    const response = await adminApi.get(`/registrations/${id}`);
    return response.data;
  },

  review: async (id, action, rejectionReason = '') => {
    // Use POST instead of PUT for better compatibility
    const response = await adminApi.post(`/registrations/${id}/review`, {
      action,
      rejectionReason
    });
    return response.data;
  },

  // AI Screening endpoints
  getScreeningDetails: async (id) => {
    const response = await adminApi.get(`/registrations/${id}/screening`);
    return response.data;
  },

  rescanScreening: async (id) => {
    const response = await adminApi.post(`/registrations/${id}/screening/rescan`);
    return response.data;
  },

  overrideAIDecision: async (id, reason = '') => {
    const response = await adminApi.put(`/registrations/${id}/screening/override`, {
      reason
    });
    return response.data;
  }
};

// ==================== AUDIT LOG API ====================

export const auditApi = {
  getLogs: async (params = {}) => {
    const {
      pageNumber = 1,
      pageSize = 20,
      category,
      actionType,
      targetType,
      targetId,
      adminUserId,
      startTime,
      endTime
    } = params;

    // Build clean params object - only include non-empty values
    const queryParams = { pageNumber, pageSize };
    if (category) queryParams.category = category;
    if (actionType) queryParams.actionType = actionType;
    if (targetType) queryParams.targetType = targetType;
    if (targetId) queryParams.targetId = targetId;
    if (adminUserId) queryParams.adminUserId = adminUserId;
    if (startTime) queryParams.startTime = startTime;
    if (endTime) queryParams.endTime = endTime;

    const response = await adminApi.get('/audit-logs', { params: queryParams });
    return response.data;
  },

  getLogDetail: async (id) => {
    const response = await adminApi.get(`/audit-logs/${id}`);
    return response.data;
  },

  /**
   * Export the merged Audit Log (schedule + admin) matching the given filters.
   * @param {object} params - { source: 'ALL'|'SCHEDULE'|'ADMIN', category?, doctorId?, actionType?, startTime?, endTime?, format: 'CSV'|'XLSX' }
   */
  exportLogs: async (params = {}) => {
    const {
      source = 'ALL',
      category,
      doctorId,
      actionType,
      startTime,
      endTime,
      format = 'CSV'
    } = params;

    const queryParams = { source, format };
    if (category) queryParams.category = category;
    if (doctorId) queryParams.doctorId = doctorId;
    if (actionType) queryParams.actionType = actionType;
    if (startTime) queryParams.startTime = startTime;
    if (endTime) queryParams.endTime = endTime;

    const response = await adminApi.get('/audit-log/export', {
      params: queryParams,
      responseType: 'blob'
    });

    const isXlsx = format === 'XLSX';
    const mimeType = isXlsx
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'text/csv';
    const dateStr = new Date().toISOString().slice(0, 10);

    const url = URL.createObjectURL(new Blob([response.data], { type: mimeType }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-log-${dateStr}.${isXlsx ? 'xlsx' : 'csv'}`;
    link.click();
    URL.revokeObjectURL(url);
  }
};

// ==================== SCHEDULE API ====================

export const scheduleApi = {
  /**
   * Lấy lịch làm việc của bác sĩ (bao gồm exceptions).
   * @param {string} doctorId - Doctor ID
   */
  getDoctorSchedule: async (doctorId) => {
    const response = await adminApi.get(`/schedule/doctors/${doctorId}`);
    return response.data;
  },

  /**
   * Lấy lịch làm việc của bác sĩ trong khoảng thời gian.
   * @param {string} doctorId - Doctor ID
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   */
  getDoctorScheduleInRange: async (doctorId, startDate, endDate) => {
    const response = await adminApi.get(`/schedule/doctors/${doctorId}/range`, {
      params: { startDate, endDate }
    });
    return response.data;
  },

  /**
   * Lấy lịch sử hành động của Admin (audit log).
   * @param {object} params - { pageNumber, pageSize, adminUserId?, doctorId?, actionType?, startTime?, endTime? }
   */
  getAuditLogs: async (params = {}) => {
    const { pageNumber = 1, pageSize = 20, adminUserId, doctorId, actionType, startTime, endTime } = params;
    const response = await adminApi.get('/schedule/audit-log', {
      params: { pageNumber, pageSize, adminUserId, doctorId, actionType, startTime, endTime }
    });
    return response.data;
  },

  getScheduleChangeRequests: async () => {
    const response = await adminApi.get('/schedule/change-requests');
    return response.data || [];
  },

  /**
   * @param {number} requestId
   * @param {object} resolveData - { resolutionType: 'REASSIGN'|'CANCEL', newDoctorId?, adminReason }
   */
  approveScheduleChangeRequest: async (requestId, resolveData) => {
    const response = await adminApi.post(`/schedule/change-requests/${requestId}/approve`, resolveData);
    return response.data;
  },

  rejectScheduleChangeRequest: async (requestId, adminReason = '') => {
    const response = await adminApi.post(`/schedule/change-requests/${requestId}/reject`, null, {
      params: { adminReason }
    });
    return response.data;
  },

  getHomeVisitConfig: async () => {
    const response = await adminApi.get('/home-visit/config');
    return response.data;
  }
};

export default adminApi;
