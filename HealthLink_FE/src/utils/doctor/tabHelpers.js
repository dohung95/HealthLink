export { getPatientInitials, getTypeIcon } from './sharedHelpers';

export const toLocalDateValue = (date) => {
  if (!date) return '';
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return '';

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const toMonthValue = (date) => {
  if (!date) return '';
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return '';
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
};

export const buildFollowUpDateTime = (date, startTime) => {
  const dateValue = toLocalDateValue(date);
  if (!dateValue || !startTime) return null;
  return `${dateValue}T${startTime}:00`;
};

export const normalizeStatus = (status) => String(status || '').toLowerCase().replace(/[\s_-]/g, '');

export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const formatCompactDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const formatTime = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return 'N/A';
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return 'N/A';

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age;
};

export const getStatusLabel = (status) => {
  const key = normalizeStatus(status);
  if (key === 'inprogress' || key === 'inconsultation') return 'In Progress';
  if (key === 'scheduled') return 'Scheduled';
  if (key === 'completed') return 'Completed';
  if (key === 'cancelled' || key === 'canceled') return 'Cancelled';
  return status || 'Unknown';
};

export const getStatusClassName = (status) => {
  const key = normalizeStatus(status);
  if (key === 'completed') return 'doctor-detail-status doctor-detail-status--completed';
  if (key === 'scheduled') return 'doctor-detail-status doctor-detail-status--scheduled';
  if (key === 'cancelled' || key === 'canceled') return 'doctor-detail-status doctor-detail-status--cancelled';
  if (key === 'inprogress') return 'doctor-detail-status doctor-detail-status--progress';
  return 'doctor-detail-status';
};

export const getTypeClassName = (type) => {
  switch ((type || '').toLowerCase()) {
    case 'video call':
      return 'doctor-detail-chip doctor-detail-chip--video';
    case 'audio call':
      return 'doctor-detail-chip doctor-detail-chip--audio';
    case 'chat':
      return 'doctor-detail-chip doctor-detail-chip--chat';
    default:
      return 'doctor-detail-chip';
  }
};

export const buildConsultation = (source) => {
  const consultation = source?.consultation || {};

  return {
    consultationId: consultation.consultationId ?? source?.consultationId ?? null,
    startTime: consultation.startTime ?? source?.consultationStartTime ?? source?.startTime ?? null,
    endTime: consultation.endTime ?? source?.consultationEndTime ?? source?.endTime ?? null,
    diagnosis: consultation.diagnosis ?? source?.diagnosis ?? null,
    doctorNotes: consultation.doctorNotes ?? source?.doctorNotes ?? null,
    treatmentPlan: consultation.treatmentPlan ?? source?.treatmentPlan ?? null,
    followUpDate: consultation.followUpDate ?? source?.followUpDate ?? null,
    followUpAppointmentId: consultation.followUpAppointmentId ?? source?.followUpAppointmentId ?? null,
    followUpNotes: consultation.followUpNotes ?? source?.followUpNotes ?? null,
  };
};
