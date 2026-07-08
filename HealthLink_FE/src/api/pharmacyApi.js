import axiosInstance from './axiosConfig';

export const pharmacyApi = {
  getPublicPharmacies: async (params = {}) => {
    const response = await axiosInstance.get('/api/account/pharmacy/public', { params });
    return response.data || [];
  },

  getOrdersByPatient: async (patientId, status) => {
    const response = await axiosInstance.get(`/api/pharmacy-orders/patient/${patientId}`, {
      params: status && status !== 'ALL' ? { status } : {},
    });
    return response.data || [];
  },

  createOrderFromPrescription: async (payload) => {
    const response = await axiosInstance.post('/api/pharmacy-orders', payload);
    return response.data;
  },

  getOrdersByPharmacy: async (pharmacyId, status) => {
    const response = await axiosInstance.get(`/api/pharmacy-orders/pharmacy/${pharmacyId}`, {
      params: status && status !== 'ALL' ? { status } : {},
    });
    return response.data || [];
  },

  getOrderById: async (orderId) => {
    const response = await axiosInstance.get(`/api/pharmacy-orders/${orderId}`);
    return response.data;
  },

  updateOrderStatus: async (orderId, payload) => {
    const response = await axiosInstance.patch(`/api/pharmacy-orders/${orderId}/status`, payload);
    return response.data;
  },

  cancelOrder: async (orderId, payload) => {
    const response = await axiosInstance.post(`/api/pharmacy-orders/${orderId}/cancel`, payload);
    return response.data;
  },

  getConsultationRequestsByPharmacy: async (pharmacyId, status) => {
    const response = await axiosInstance.get(`/api/pharmacy-requests/pharmacy/${pharmacyId}`, {
      params: status && status !== 'ALL' ? { status } : {},
    });
    return response.data || [];
  },

  getConsultationRequestsByPatient: async (patientId) => {
    const response = await axiosInstance.get(`/api/pharmacy-requests/patient/${patientId}`);
    return response.data || [];
  },

  createConsultationRequest: async (payload) => {
    const response = await axiosInstance.post('/api/pharmacy-requests', payload);
    return response.data;
  },

  getConsultationRequestById: async (requestId) => {
    const response = await axiosInstance.get(`/api/pharmacy-requests/${requestId}`);
    return response.data;
  },

  updateConsultationStatus: async (requestId, payload) => {
    const response = await axiosInstance.patch(`/api/pharmacy-requests/${requestId}/status`, payload);
    return response.data;
  },

  getRequestPrescriptions: async (requestId) => {
    const response = await axiosInstance.get(`/api/pharmacy-requests/${requestId}/prescriptions`);
    return response.data || [];
  },

  createOrderFromRequest: async (requestId, payload) => {
    const response = await axiosInstance.post(`/api/pharmacy-requests/${requestId}/order`, payload);
    return response.data;
  },

  // ======== Inventory API ========
  getInventory: async (params = {}) => {
    const response = await axiosInstance.get('/api/pharmacy/inventory', { params });
    return response.data;
  },

  getInventoryItem: async (inventoryId) => {
    const response = await axiosInstance.get(`/api/pharmacy/inventory/${inventoryId}`);
    return response.data;
  },

  updateInventory: async (inventoryId, payload) => {
    const response = await axiosInstance.patch(`/api/pharmacy/inventory/${inventoryId}`, payload);
    return response.data;
  },

  importInventoryCsv: async (file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosInstance.post('/api/pharmacy/inventory/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    });
    return response.data;
  },

  downloadInventoryTemplate: async () => {
    const response = await axiosInstance.get('/api/pharmacy/inventory/template', {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'inventory-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  },

  // ======== Recommendation API ========
  getRecommendations: async (params = {}) => {
    const response = await axiosInstance.get('/api/account/pharmacy/public/recommendations', { params });
    return response.data || [];
  },

  getRetailRecommendations: async (payload) => {
    const response = await axiosInstance.post('/api/account/pharmacy/public/recommendations/cart', payload);
    return response.data || [];
  },

  createRetailOrder: async (payload) => {
    const response = await axiosInstance.post('/api/pharmacy-orders/retail', payload);
    return response.data;
  },

  // ======== Work Items API ========
  getWorkItemsByPharmacy: async (pharmacyId) => {
    const response = await axiosInstance.get(`/api/pharmacy-work-items/pharmacy/${pharmacyId}`);
    return response.data || [];
  },

  // ======== Analytics API ========
  getDemandAnalytics: async (params = {}) => {
    const response = await axiosInstance.get('/api/account/pharmacy/analytics/demand', { params });
    return response.data;
  },

  // ======== Geocoding API ========
  geocodeAddress: async (address) => {
    const response = await axiosInstance.post('/api/geocoding/geocode', { address });
    return response.data;
  },

  reverseGeocode: async ({ latitude, longitude }) => {
    const response = await axiosInstance.post('/api/geocoding/reverse', { latitude, longitude });
    return response.data;
  },

  // ======== Revision & Quote update ========
  requestOrderRevision: async (orderId, payload) => {
    const response = await axiosInstance.post(`/api/pharmacy-orders/${orderId}/request-revision`, payload);
    return response.data;
  },

  updateOrderQuote: async (orderId, payload) => {
    const response = await axiosInstance.put(`/api/pharmacy-orders/${orderId}/quote`, payload);
    return response.data;
  },

  updateOrderDeliveryContact: async (orderId, payload) => {
    const response = await axiosInstance.patch(`/api/pharmacy-orders/${orderId}/delivery-contact`, payload);
    return response.data;
  },

  requestDeliveryContactChange: async (orderId, payload) => {
    const response = await axiosInstance.post(`/api/pharmacy-orders/${orderId}/delivery-contact-change-requests`, payload);
    return response.data;
  },

  reviewDeliveryContactChange: async (requestId, payload) => {
    const response = await axiosInstance.patch(`/api/pharmacy-orders/delivery-contact-change-requests/${requestId}/status`, payload);
    return response.data;
  },

  submitDeliveryQuote: async (orderId, payload) => {
    const response = await axiosInstance.patch(`/api/pharmacy-orders/${orderId}/delivery-quote`, payload);
    return response.data;
  },

  confirmOrderTotalByPatient: async (orderId) => {
    const response = await axiosInstance.post(`/api/pharmacy-orders/${orderId}/patient-confirm`);
    return response.data;
  },
};

export default pharmacyApi;
