export const NAV_ITEMS = [
  { key: 'appointments', label: 'Appointments', icon: 'calendar_today', wide: true },
  { key: 'patients',     label: 'Patients',     icon: 'groups',          wide: true },
  { key: 'prescriptions',label: 'Prescriptions', icon: 'medication',     wide: true },
  { key: 'reviews',      label: 'Reviews',       icon: 'star',           wide: true },
  { key: 'schedule',     label: 'Schedule',      icon: 'event_note',     wide: true },
  { key: 'chat',         label: 'Chat',          icon: 'chat',           wide: true },
{ key: 'wallet', label: 'Wallet', icon: 'account_balance_wallet', wide: false },
];

export const APPOINTMENT_DETAIL_VIEW = 'appointmentDetail';
export const PATIENT_DETAIL_VIEW = 'patientDetail';

export const normalizeAppointmentDetail = (detail, appointmentId) => ({
  ...detail,
  appointmentID: detail?.appointmentID ?? detail?.appointmentId ?? appointmentId,
  appointmentId: detail?.appointmentId ?? detail?.appointmentID ?? appointmentId,
  doctorID: detail?.doctorID ?? detail?.doctorId,
  doctorId: detail?.doctorId ?? detail?.doctorID,
  patient: {
    patientID: detail?.patientId ?? detail?.patientID,
    patientId: detail?.patientId ?? detail?.patientID,
    fullName: detail?.patientName,
  },
});

export const formatNotificationTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} min${diffMinutes === 1 ? '' : 's'} ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const getNotificationTone = (notification) => {
  const value = `${notification?.type || ''} ${notification?.message || ''}`.toLowerCase();
  if (value.includes('wallet') || value.includes('balance')) {
    return { icon: 'account_balance_wallet', title: 'Wallet Update', tone: 'success' };
  }
  if (value.includes('emergency') || value.includes('urgent')) {
    return { icon: 'emergency', title: 'Emergency Update', tone: 'critical' };
  }
  if (value.includes('lab') || value.includes('record')) {
    return { icon: 'lab_research', title: 'Medical Record', tone: 'warning' };
  }
  if (value.includes('review') || value.includes('rating')) {
    return { icon: 'star', title: 'New Review', tone: 'warning' };
  }
  if (value.includes('time arrived') || value.includes('ready to start')) {
    return { icon: 'play_circle', title: 'Appointment time arrived', tone: 'primary' };
  }
  return { icon: 'event', title: 'Appointment Update', tone: 'primary' };
};
