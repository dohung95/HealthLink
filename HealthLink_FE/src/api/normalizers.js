const DOCTOR_NOTIFICATION_TYPES = new Set([
  'NEW_APPOINTMENT',
  'CANCEL_APPOINTMENT',
  'APPOINTMENT_REMINDER',
  'PRESCRIPTION_SENT_TO_PHARMACY',
  'INVOICE_PAID',
  'NEW_PHARMACY_REQUEST',
  'ORDER_STATUS',
  'NEW_ORDER',
]);

export function normalizeReview(review = {}) {
  return {
    ...review,
    reviewId: review.reviewId ?? review.reviewID ?? null,
    reviewID: review.reviewID ?? review.reviewId ?? null,
    patientName: review.patientName ?? review.patient?.fullName ?? 'Anonymous',
    patient: review.patient ?? {
      fullName: review.patientName ?? 'Anonymous',
    },
    isRead: review.isRead ?? review.read ?? false,
  };
}

export function normalizeDoctorSummary(doctor = {}) {
  return {
    ...doctor,
    doctorId: doctor.doctorId ?? doctor.doctorID ?? doctor.id ?? null,
    doctorID: doctor.doctorID ?? doctor.doctorId ?? doctor.id ?? null,
    specialtyName: doctor.specialtyName ?? doctor.specialty ?? '',
    specialty: doctor.specialty ?? doctor.specialtyName ?? '',
    description: doctor.description ?? doctor.bio ?? '',
    bio: doctor.bio ?? doctor.description ?? '',
    hospital: doctor.hospital ?? doctor.clinicName ?? '',
    clinicName: doctor.clinicName ?? doctor.hospital ?? '',
    workingAddress: doctor.workingAddress ?? doctor.clinicAddress ?? '',
    clinicAddress: doctor.clinicAddress ?? doctor.workingAddress ?? '',
    availableTypes: doctor.availableTypes ?? [],
    reviews: Array.isArray(doctor.reviews) ? doctor.reviews.map(normalizeReview) : [],
  };
}

export function normalizeDoctorProfile(doctor = {}) {
  return normalizeDoctorSummary(doctor);
}

export function normalizeAppointment(appointment = {}) {
  const appointmentId = appointment.appointmentId ?? appointment.appointmentID ?? null;
  const patientId = appointment.patientId ?? appointment.patientID ?? appointment.patient?.patientId ?? appointment.patient?.patientID ?? null;
  const doctorId = appointment.doctorId ?? appointment.doctorID ?? appointment.doctor?.doctorId ?? appointment.doctor?.doctorID ?? null;
  const consultationType = appointment.consultationType ?? '';

  return {
    ...appointment,
    appointmentId,
    appointmentID: appointmentId,
    patientId,
    patientID: patientId,
    patientName: appointment.patientName ?? appointment.patient?.fullName ?? 'Unknown Patient',
    doctorId,
    doctorID: doctorId,
    doctorName: appointment.doctorName ?? appointment.doctor?.fullName ?? 'Unknown Doctor',
    specialtyName: appointment.specialtyName ?? appointment.specialty ?? '',
    specialty: appointment.specialty ?? appointment.specialtyName ?? '',
    reason: appointment.reason ?? appointment.symptoms ?? '',
    patient: appointment.patient ?? {
      patientId,
      patientID: patientId,
      fullName: appointment.patientName ?? 'Unknown Patient',
    },
    doctor: appointment.doctor ?? {
      doctorId,
      doctorID: doctorId,
      fullName: appointment.doctorName ?? 'Unknown Doctor',
    },
    consultationType:
      consultationType === 'Video' ? 'Video Call' :
      consultationType === 'Audio' ? 'Audio Call' :
      consultationType,
  };
}

export function normalizePrescription(prescription = {}) {
  const items = Array.isArray(prescription.items)
    ? prescription.items
    : Array.isArray(prescription.medications)
      ? prescription.medications
      : [];

  return {
    ...prescription,
    prescriptionHeaderId: prescription.prescriptionHeaderId ?? prescription.prescriptionHeaderID ?? null,
    prescriptionHeaderID: prescription.prescriptionHeaderID ?? prescription.prescriptionHeaderId ?? null,
    appointmentId: prescription.appointmentId ?? prescription.appointmentID ?? null,
    appointmentID: prescription.appointmentID ?? prescription.appointmentId ?? null,
    patientId: prescription.patientId ?? prescription.patientID ?? null,
    patientID: prescription.patientID ?? prescription.patientId ?? null,
    doctorId: prescription.doctorId ?? prescription.doctorID ?? null,
    doctorID: prescription.doctorID ?? prescription.doctorId ?? null,
    medications: items,
    items,
  };
}

export function normalizeNotification(notification = {}) {
  const type = notification.type ?? notification.eventType ?? '';
  const relatedId = notification.relatedId ?? notification.appointmentId ?? notification.prescriptionHeaderId ?? null;
  const isPrescription = type === 'NEW_PRESCRIPTION';
  const isDoctorNotification = DOCTOR_NOTIFICATION_TYPES.has(type);

  return {
    ...notification,
    notificationId: notification.notificationId ?? notification.notificationID ?? null,
    notificationID: notification.notificationID ?? notification.notificationId ?? null,
    isRead: notification.isRead ?? notification.read ?? false,
    read: notification.read ?? notification.isRead ?? false,
    eventType: notification.eventType ?? type,
    type,
    appointmentId: notification.appointmentId ?? (!isPrescription ? relatedId : null),
    prescriptionHeaderId: notification.prescriptionHeaderId ?? (isPrescription ? relatedId : null),
    relatedId,
    isDoctorNotification,
  };
}
