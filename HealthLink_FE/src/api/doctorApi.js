import axiosInstance from './axiosConfig';
import {
  normalizeAppointment,
  normalizeDoctorPatientHistory,
  normalizeDoctorPatientSummary,
  normalizeDoctorProfile,
  normalizeDoctorSummary,
  normalizeReview,
} from './normalizers';

export const doctorService = {
  searchDoctors: async (params = {}) => {
    const response = await axiosInstance.get('/api/account/doctors/search', {
      params: {
        specialty: params.specialty || undefined,
        name: params.name || undefined,
        location: params.location || undefined,
        page: params.page || 1,
        pageSize: params.pageSize || 5,
      },
    });

    return {
      ...response.data,
      items: (response.data?.items || []).map(normalizeDoctorSummary),
    };
  },

  getSpecialties: async () => {
    const response = await axiosInstance.get('/api/account/doctors/specialties');
    return response.data || [];
  },

  getAllDoctors: async () => {
    const response = await axiosInstance.get('/api/account/doctors');
    return (response.data || []).map(normalizeDoctorSummary);
  },

  getDoctorById: async (id) => {
    const response = await axiosInstance.get(`/api/account/doctors/public/${id}`);
    return normalizeDoctorProfile(response.data);
  },

  getDoctorSchedules: async (doctorId) => {
    const response = await axiosInstance.get(`/api/account/doctors/${doctorId}/schedules`);
    return response.data || [];
  },

  getCurrentDoctor: async () => {
    const response = await axiosInstance.get('/api/account/doctors/profile');
    return normalizeDoctorProfile(response.data);
  },

  getDoctorAppointments: async (doctorId) => {
    const response = await axiosInstance.get(`/api/appointments/doctor/${doctorId}`);
    return (response.data || []).map(normalizeAppointment);
  },

  getDoctorDailyAppointments: async (doctorId, date, status = 'All') => {
    const response = await axiosInstance.get(`/api/appointments/doctor/${doctorId}/daily`, {
      params: {
        date,
        status,
      },
    });

    return {
      ...response.data,
      appointments: (response.data?.appointments || []).map(normalizeAppointment),
      counts: response.data?.counts || {
        all: 0,
        scheduled: 0,
        completed: 0,
        cancelled: 0,
      },
    };
  },

  getMyDoctorPatients: async (params = {}) => {
    const response = await axiosInstance.get('/api/account/doctors/me/patients', {
      params: {
        search: params.search || undefined,
        status: params.status || 'all',
        page: params.page || 1,
        pageSize: params.pageSize || 12,
      },
    });

    return {
      ...response.data,
      patients: (response.data?.patients || []).map(normalizeDoctorPatientSummary),
      pageNumber: response.data?.pageNumber || 1,
      pageSize: response.data?.pageSize || 12,
      totalCount: response.data?.totalCount || 0,
      totalPages: response.data?.totalPages || 1,
    };
  },

  getMyDoctorPatientHistory: async (patientId) => {
    const response = await axiosInstance.get(`/api/account/doctors/me/patients/${patientId}/history`);
    return normalizeDoctorPatientHistory(response.data);
  },

  getDoctorReviews: async (doctorId) => {
    const profile = await doctorService.getDoctorById(doctorId);
    return Array.isArray(profile.reviews) ? profile.reviews.map(normalizeReview) : [];
  },

  getPatientById: async (patientId) => {
    const response = await axiosInstance.get(`/api/account/patient/profile/${patientId}`);
    return response.data;
  },
};

/**
 * Doctor Schedule Management Service
 * For doctors to self-manage their weekly schedules and exceptions
 */
export const doctorScheduleService = {
  // ========== Weekly Schedules ==========

  /**
   * Get doctor's weekly schedule and exceptions
   */
  getMySchedule: async () => {
    const response = await axiosInstance.get('/api/doctors/schedule');
    return response.data;
  },

  /**
   * Create a new weekly schedule entry
   */
  createSchedule: async (data) => {
    const response = await axiosInstance.post('/api/doctors/schedule', data);
    return response.data;
  },

  /**
   * Update an existing schedule
   */
  updateSchedule: async (scheduleId, data) => {
    const response = await axiosInstance.put(`/api/doctors/schedule/${scheduleId}`, data);
    return response.data;
  },

  /**
   * Delete a schedule
   */
  deleteSchedule: async (scheduleId) => {
    const response = await axiosInstance.delete(`/api/doctors/schedule/${scheduleId}`);
    return response.data;
  },

  /**
   * Toggle schedule availability
   */
  toggleAvailability: async (scheduleId, available) => {
    const response = await axiosInstance.patch(
      `/api/doctors/schedule/${scheduleId}/availability?available=${available}`
    );
    return response.data;
  },

  // ========== Exceptions ==========

  /**
   * Get exceptions in date range
   */
  getExceptions: async (startDate, endDate) => {
    const response = await axiosInstance.get('/api/doctors/schedule/exceptions', {
      params: { startDate, endDate }
    });
    return response.data;
  },

  /**
   * Create a schedule exception (DayOff, Modified, AddSlot)
   */
  createException: async (data) => {
    const response = await axiosInstance.post('/api/doctors/schedule/exceptions', data);
    return response.data;
  },

  /**
   * Delete an exception (cannot delete admin-created)
   */
  deleteException: async (exceptionId) => {
    const response = await axiosInstance.delete(`/api/doctors/schedule/exceptions/${exceptionId}`);
    return response.data;
  },

  // ========== Calendar View ==========

  /**
   * Get calendar view with slot statuses for a date range
   */
  getCalendarView: async (startDate, endDate) => {
    const response = await axiosInstance.get('/api/doctors/schedule/calendar', {
      params: { startDate, endDate }
    });
    return response.data;
  },
};
