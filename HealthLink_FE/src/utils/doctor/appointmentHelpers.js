export const STATUS_TONES = {
  scheduled: {
    badge: 'badge bg-surface-container-highest text-text-muted',
    railClass: 'doctor-appointment-card__rail--scheduled',
    dot: 'bg-surface-variant',
  },
  completed: {
    badge: 'badge bg-success text-white',
    railClass: 'doctor-appointment-card__rail--completed',
    dot: 'bg-success',
  },
  cancelled: {
    badge: 'badge bg-critical text-white',
    railClass: 'doctor-appointment-card__rail--cancelled',
    dot: 'bg-critical',
  },
  inprogress: {
    badge: 'badge bg-warning text-white',
    railClass: 'doctor-appointment-card__rail--inprogress',
    dot: 'bg-warning',
  },
  default: {
    badge: 'badge bg-surface-container text-text-main',
    railClass: '',
    dot: 'bg-primary-container',
  },
};

export const TYPE_TONES = {
  video: 'badge bg-primary text-white',
  audio: 'badge bg-surface-container text-text-main',
  chat: 'badge bg-surface-container-highest text-text-main',
  offline: 'badge bg-surface-container text-text-main',
  default: 'badge bg-surface-container text-text-main',
};

export const toDateInputValue = (date) => {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return '';

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseAppointmentDate = (appointment) => {
  const value = appointment?.appointmentTime ? new Date(appointment.appointmentTime) : null;
  return value && !Number.isNaN(value.getTime()) ? value : null;
};

export const formatDateLabel = (dateValue) => {
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'Selected day';
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const formatShortDate = (dateValue) => {
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'Today';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatTimeFromDateInner = (date) => {
  if (!date || Number.isNaN(date.getTime())) return 'Time TBD';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const formatTimeFromDate = formatTimeFromDateInner;

export const getPatientName = (appointment) =>
  appointment?.patient?.fullName || appointment?.patientName || 'Unknown Patient';

export const getPatientAvatar = (appointment) =>
  appointment?.patient?.avatarUrl ||
  appointment?.patient?.profileImage ||
  appointment?.patientAvatar ||
  appointment?.avatarUrl ||
  '';

export const getPatientInitials = (name) =>
  String(name || 'UP')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'UP';

export const getVisitReason = (appointment) =>
  [appointment?.reason, appointment?.symptoms, appointment?.chiefComplaint]
    .find((value) => typeof value === 'string' && value.trim()) || '';

export const getTypeKey = (type) => {
  const value = String(type || '').toLowerCase();
  if (value.includes('video')) return 'video';
  if (value.includes('audio') || value.includes('call')) return 'audio';
  if (value.includes('chat')) return 'chat';
  if (value.includes('offline') || value.includes('room') || value.includes('clinic')) return 'offline';
  return 'default';
};

export const getTypeIcon = (type) => {
  const key = getTypeKey(type);
  if (key === 'video') return 'videocam';
  if (key === 'audio') return 'call';
  if (key === 'chat') return 'chat';
  if (key === 'offline') return 'local_hospital';
  return 'event';
};

export const getDisplayStatus = (appointment) => {
  const status = String(appointment?.status || 'Scheduled');
  const normalized = status.toLowerCase().replace(/[\s_-]/g, '');
  const hasStarted = Boolean(appointment?.consultationStartTime || appointment?.hasStarted);

  if (normalized.includes('cancel')) return 'Cancelled';
  if (normalized.includes('complete')) return 'Completed';
  if (normalized.includes('progress') || (hasStarted && normalized.includes('scheduled'))) return 'In Progress';
  if (normalized.includes('scheduled')) return 'Scheduled';
  return status;
};

export const getStatusKey = (appointment) => getDisplayStatus(appointment).toLowerCase().replace(/[\s_-]/g, '');

export const getDurationLabel = (appointment) => {
  const start = appointment?.consultationStartTime ? new Date(appointment.consultationStartTime) : null;
  const end = appointment?.consultationEndTime ? new Date(appointment.consultationEndTime) : null;

  if (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end > start) {
    const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
    return `${minutes} min${minutes === 1 ? '' : 's'}`;
  }

  const explicitDuration = appointment?.durationMinutes || appointment?.slotDuration || appointment?.duration;
  if (explicitDuration) return `${explicitDuration} mins`;
  return '30 mins';
};

export const getPatientMeta = (appointment) => {
  const patient = appointment?.patient || {};
  const parts = [];
  if (patient.patientID || appointment?.patientID || appointment?.patientId) {
    parts.push(`ID: ${patient.patientID || appointment.patientID || appointment.patientId}`);
  }
  if (patient.gender) parts.push(patient.gender);
  if (patient.age) parts.push(`${patient.age}y`);
  return parts.join(' • ');
};

export const isSameLocalDay = (left, right) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

export const isActionableAppointment = (appointment) => {
  const statusKey = getStatusKey(appointment);
  return statusKey !== 'cancelled' && statusKey !== 'completed';
};
