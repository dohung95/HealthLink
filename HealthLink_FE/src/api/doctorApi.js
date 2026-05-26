import axiosInstance from './axiosConfig';
import {
  normalizeAppointment,
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
