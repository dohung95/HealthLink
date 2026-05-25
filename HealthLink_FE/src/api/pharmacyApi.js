import axiosInstance from './axiosConfig';

export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'SHIPPING',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED',
];

export const CONSULTATION_STATUSES = [
  'PENDING',
  'IN_REVIEW',
  'NEED_MORE_INFO',
  'PRESCRIPTION_CREATED',
  'ORDER_CREATED',
  'CANCELLED',
];

export const pharmacyApi = {
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

  getConsultationRequestsByPharmacy: async (pharmacyId, status) => {
    const response = await axiosInstance.get(`/api/pharmacy-requests/pharmacy/${pharmacyId}`, {
      params: status && status !== 'ALL' ? { status } : {},
    });
    return response.data || [];
  },

  getConsultationRequestById: async (requestId) => {
    const response = await axiosInstance.get(`/api/pharmacy-requests/${requestId}`);
    return response.data;
  },

  updateConsultationStatus: async (requestId, payload) => {
    const response = await axiosInstance.patch(`/api/pharmacy-requests/${requestId}/status`, payload);
    return response.data;
  },

  createPrescriptionFromRequest: async (requestId, payload) => {
    const response = await axiosInstance.post(`/api/pharmacy-requests/${requestId}/prescription`, payload);
    return response.data;
  },

  createOrderFromRequest: async (requestId, payload) => {
    const response = await axiosInstance.post(`/api/pharmacy-requests/${requestId}/order`, payload);
    return response.data;
  },
};

export default pharmacyApi;
