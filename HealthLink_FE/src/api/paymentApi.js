import axiosInstance from './axiosConfig';

const toAppointmentPaymentPayload = (bookingDraft, extra = {}) => {
  const {
    patientId,
    doctorId,
    appointmentTime,
    consultationType,
    symptoms,
    notes,
    currency,
  } = bookingDraft || {};

  return {
    patientId,
    doctorId,
    appointmentTime,
    consultationType,
    symptoms,
    notes,
    currency: currency || 'USD',
    ...extra,
  };
};

export const paymentApi = {
  generateAppointmentInvoice: async (appointmentId) => {
    const response = await axiosInstance.post(`/api/payment/invoices/generate/${appointmentId}`);
    return response.data;
  },

  getInvoice: async (invoiceId) => {
    const response = await axiosInstance.get(`/api/payment/invoices/${invoiceId}`);
    return response.data;
  },

  createPayPalOrder: async ({ invoiceId, currency = 'USD' }) => {
    const response = await axiosInstance.post('/api/payment/paypal/create', {
      invoiceId,
      currency,
    });
    return response.data;
  },

  createAppointmentPayPalOrder: async (bookingDraft) => {
    const response = await axiosInstance.post(
      '/api/payment/appointments/paypal/create',
      toAppointmentPaymentPayload(bookingDraft)
    );
    return response.data;
  },

  capturePayPalPayment: async ({ invoiceId, orderId, paymentMethod = 'EWallet' }) => {
    const response = await axiosInstance.post('/api/payment/paypal/capture', {
      invoiceId,
      orderId,
      paymentMethod,
    });
    return response.data;
  },

  captureAppointmentPayPalPayment: async (bookingDraft, orderId, paymentMethod = 'EWallet') => {
    const response = await axiosInstance.post(
      '/api/payment/appointments/paypal/capture',
      toAppointmentPaymentPayload(bookingDraft, { orderId, paymentMethod })
    );
    return response.data;
  },

  getPartnerBalance: async (partnerId, type = 'DOCTOR') => {
    const response = await axiosInstance.get(`/api/payment/partner/${partnerId}/balance`, {
      params: { type },
    });
    return response.data;
  },

  getPartnerTransactions: async (partnerId) => {
    const response = await axiosInstance.get(`/api/payment/partner/${partnerId}/transactions`);
    return response.data;
  },

  getPartnerSettlements: async (partnerId) => {
    const response = await axiosInstance.get(`/api/payment/partner/${partnerId}/settlements`);
    return response.data;
  },

  requestPartnerSettlement: async (partnerId, payload, type = 'DOCTOR') => {
    const response = await axiosInstance.post(`/api/payment/partner/${partnerId}/settle`, payload, {
      params: { type },
    });
    return response.data;
  },
};
