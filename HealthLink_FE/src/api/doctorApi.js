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
