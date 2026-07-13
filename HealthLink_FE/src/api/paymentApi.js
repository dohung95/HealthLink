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
    doctorSelectionMode,
    manualSelectionFee,

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
    homeVisitServiceIds,
    selectedHomeVisitServices,
    homeVisitStartTime,
    homeVisitEndTime,
  } = bookingDraft || {};

  const resolvedHomeVisitServiceIds =
    homeVisitServiceIds?.length > 0
      ? homeVisitServiceIds
      : selectedHomeVisitServices?.map((item) => item.serviceId).filter(Boolean) || [];

  return {
    patientId,
    doctorId,
    appointmentTime,
    consultationType,
    symptoms,
    notes,
    doctorSelectionMode,
    manualSelectionFee,

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
    homeVisitServiceIds: resolvedHomeVisitServiceIds,
    homeVisitStartTime,
    homeVisitEndTime,

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

  getPartnerPinStatus: async () => {
    const response = await axiosInstance.get('/api/payment/partner/security/pin');
    return response.data;
  },

  requestPartnerPinOtp: async () => {
    const response = await axiosInstance.post('/api/payment/partner/security/pin/request-otp');
    return response.data;
  },

  verifyPartnerPinOtp: async (payload) => {
    const response = await axiosInstance.post('/api/payment/partner/security/pin/verify-otp', payload);
    return response.data;
  },

  setPartnerPin: async (payload) => {
    const response = await axiosInstance.put('/api/payment/partner/security/pin', payload);
    return response.data;
  },

  createFollowUpPayPalOrder: async (appointmentId) => {
    const response = await axiosInstance.post(`/api/payment/follow-up/${appointmentId}/create`);
    return response.data;
  },

  captureFollowUpPayPalOrder: async (appointmentId, orderId, paymentMethod = 'EWallet') => {
    const response = await axiosInstance.post(`/api/payment/follow-up/${appointmentId}/capture`, {
      orderId,
      paymentMethod,
    });
    return response.data;
  },

  saveFollowUpLocation: async (appointmentId, location) => {
    const response = await axiosInstance.put(`/api/payment/follow-up/${appointmentId}/location`, location);
    return response.data;
  },
};
