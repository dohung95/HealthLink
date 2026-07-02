import axiosInstance from './axiosConfig';

export const medicineApi = {
  searchMedicines: async (input = '') => {
    const params = typeof input === 'string'
      ? (input ? { keyword: input } : {})
      : {
          keyword: input?.keyword || undefined,
          category: input?.category || undefined,
          dosageForm: input?.dosageForm || undefined,
          categoryId: input?.categoryId || undefined,
        };

    const response = await axiosInstance.get('/api/medicines', {
      params,
    });

    return response.data || [];
  },

  getMedicineCategoryTree: async () => {
    const response = await axiosInstance.get('/api/medicine-categories/tree');
    return response.data || [];
  },
};

export default medicineApi;
