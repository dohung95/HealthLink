import axiosInstance from './axiosConfig';

export const homeVisitApi = {
  scanInfo: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axiosInstance.post(
      '/api/home-visit/scan-info',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  },

  geocodeAddress: async (address) => {
    const response = await axiosInstance.get('/api/home-visit/geocode', {
      params: { address },
    });

    return response.data || [];
  },

  estimateFee: async ({ doctorId, visitLatitude, visitLongitude }) => {
    const response = await axiosInstance.post('/api/home-visit/estimate', {
      doctorId,
      visitLatitude,
      visitLongitude,
    });

    return response.data;
  },

  getSessions: async (doctorId) => {
    const response = await axiosInstance.get(`/api/doctors/${doctorId}/home-visit-sessions`);
    return response.data || [];
  },

  selectSession: async (data) => {
    const response = await axiosInstance.post('/api/home-visit/select-session', data);
    return response.data;
  },

  searchDoctors: async ({ visitLatitude, visitLongitude, specialtyName }) => {
    const response = await axiosInstance.post('/api/home-visit/doctors/search', {
      visitLatitude,
      visitLongitude,
      specialtyName,
    });

    return response.data || [];
  },

  getServices: async () => {
    const response = await axiosInstance.get('/api/home-visit/services');
    return response.data || [];
  },

  getSlots: async ({
    doctorId,
    visitLatitude,
    visitLongitude,
    homeVisitServiceIds,
  }) => {
    const response = await axiosInstance.post(
      `/api/doctors/${doctorId}/home-visit-slots`,
      {
        visitLatitude,
        visitLongitude,
        homeVisitServiceIds,
      }
    );

    return response.data || [];
  },
};
