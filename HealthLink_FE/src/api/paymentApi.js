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

    visitAddress,
    visitCity,
    contactPhone,
    reasonForHomeVisit,
    specialNotes,
    isForSelf,
    receiverName,
    receiverAge,
    receiverGender,
    receiverRelationship,
    receiverPhone,
    visitLatitude,
    visitLongitude,
    sourceConsultationId,
  } = bookingDraft || {};

  return {
    patientId,
    doctorId,
    appointmentTime,
    consultationType,
    symptoms,
    notes,

    visitAddress,
    visitCity,
    contactPhone,
    reasonForHomeVisit,
    specialNotes,
    isForSelf,
    receiverName,
    receiverAge,
    receiverGender,
    receiverRelationship,
    receiverPhone,
    visitLatitude,
    visitLongitude,
    sourceConsultationId,

    currency: currency || 'USD',
    ...extra,
  };
};

export const paymentApi = {
  getInvoice: async (invoiceId) => {
    const response = await axiosInstance.get(`/api/payment/invoices/${invoiceId}`);
    return response.data;
  },

  createAppointmentPayPalOrder: async (bookingDraft) => {
    const response = await axiosInstance.post(
      '/api/payment/appointments/paypal/create',
      toAppointmentPaymentPayload(bookingDraft)
    );
    return response.data;
  },

  captureAppointmentPayPalPayment: async (bookingDraft, orderId, paymentMethod = 'EWallet') => {
    const response = await axiosInstance.post(
      '/api/payment/appointments/paypal/capture',
      toAppointmentPaymentPayload(bookingDraft, { orderId, paymentMethod })
    );
    return response.data;
  },

  createPharmacyOrderPayPalOrder: async (pharmacyOrderId, currency = 'USD') => {
    const response = await axiosInstance.post('/api/payment/pharmacy-orders/paypal/create', {
      pharmacyOrderId,
      currency,
    });
    return response.data;
  },

  capturePharmacyOrderPayPalPayment: async (pharmacyOrderId, orderId, paymentMethod = 'EWallet') => {
    const response = await axiosInstance.post('/api/payment/pharmacy-orders/paypal/capture', {
      pharmacyOrderId,
      orderId,
      paymentMethod,
    });
    return response.data;
  },

  createHomeVisitPayPalOrder: async (bookingDraft) => {
    const { draftId, scheduleId, bookingDate } = bookingDraft || {};
    const response = await axiosInstance.post('/api/payment/home-visit/paypal/create', {
      ...toAppointmentPaymentPayload(bookingDraft),
      draftId,
      scheduleId,
      bookingDate,
      amount: 150.00,
    });
    return response.data;
  },

  captureHomeVisitPayPalPayment: async (bookingDraft, orderId, paymentMethod = 'EWallet') => {
    const { draftId, scheduleId, bookingDate } = bookingDraft || {};
    const response = await axiosInstance.post('/api/payment/home-visit/paypal/capture', {
      ...toAppointmentPaymentPayload(bookingDraft),
      draftId,
      scheduleId,
      bookingDate,
      orderId,
      paymentMethod,
    });
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
