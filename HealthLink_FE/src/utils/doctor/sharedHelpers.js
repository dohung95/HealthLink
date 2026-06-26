export function getPatientInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function getTypeIcon(type) {
  const icons = {
    VIDEO: 'videocam', AUDIO: 'call', CHAT: 'chat', OFFLINE: 'local_hospital',
  };
  return icons[type?.toUpperCase()] || 'videocam';
}

export function getTypeColor(type) {
  const colors = {
    VIDEO: '#4A90D9', AUDIO: '#7B61FF', CHAT: '#34C759', OFFLINE: '#FF9500',
  };
  return colors[type?.toUpperCase()] || '#8E8E93';
}

export function getAppointmentStatusColor(status) {
  const colors = {
    SCHEDULED: '#007AFF', CONFIRMED: '#34C759',
    IN_PROGRESS: '#FF9500', COMPLETED: '#8E8E93',
    CANCELLED: '#FF3B30', NO_SHOW: '#FF3B30',
  };
  return colors[status?.toUpperCase()] || '#8E8E93';
}
