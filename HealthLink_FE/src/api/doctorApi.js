import axiosInstance from './axiosConfig';
import {
  normalizeAppointment,
  normalizeDoctorProfile,
  normalizeDoctorSummary,
  normalizeReview,
} from './normalizers';

const paginate = (items, page = 1, pageSize = 5) => {
  const currentPage = Number(page) || 1;
  const size = Number(pageSize) || 5;
  const start = (currentPage - 1) * size;
  const pagedItems = items.slice(start, start + size);

  return {
    items: pagedItems,
    page: currentPage,
    pageSize: size,
    totalItems: items.length,
    totalPages: Math.max(1, Math.ceil(items.length / size)),
  };
};

export const doctorService = {
  searchDoctors: async (params = {}) => {
    const response = await axiosInstance.get('/api/account/doctors', {
      params: {
        specialty: params.specialty || undefined,
        name: params.name || undefined,
      },
    });

    const doctors = (response.data || []).map(normalizeDoctorSummary);
    const filtered = params.location
      ? doctors.filter((doctor) =>
          doctor.location?.toLowerCase().includes(params.location.toLowerCase()),
        )
      : doctors;

    return paginate(filtered, params.page, params.pageSize);
  },

  getSpecialties: async () => {
    const response = await axiosInstance.get('/api/registration/specialties');
    return (response.data || []).map((item) => item.name ?? item.specialtyName ?? item);
  },

  getAllDoctors: async () => {
    const response = await axiosInstance.get('/api/account/doctors');
    return (response.data || []).map(normalizeDoctorSummary);
  },

  getDoctorById: async (id) => {
    const response = await axiosInstance.get(`/api/account/doctors/${id}`);
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
