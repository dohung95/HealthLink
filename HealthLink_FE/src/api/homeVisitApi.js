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
};