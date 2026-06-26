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
};
