import axiosInstance from './axiosConfig';

export const medicineApi = {
  searchMedicines: async (keyword = '') => {
    const response = await axiosInstance.get('/api/medicines', {
      params: keyword ? { keyword } : {},
    });

    return response.data || [];
  },
};

export default medicineApi;
