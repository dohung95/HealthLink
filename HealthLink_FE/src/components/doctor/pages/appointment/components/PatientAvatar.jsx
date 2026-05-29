import React from 'react';
import { getPatientAvatar, getPatientInitials } from './appointmentHelpers';

const PatientAvatar = ({ appointment, name, size = 'card' }) => {
  const avatar = getPatientAvatar(appointment);
  const sizeMap = {
    xlarge: { width: '3.5rem', height: '3.5rem', fontSize: '0.875rem' },
    card: { width: '2rem', height: '2rem', fontSize: '0.75rem' },
    large: { width: '2.5rem', height: '2.5rem', fontSize: '0.75rem' },
    medium: { width: '2rem', height: '2rem', fontSize: '10px' },
    compact: { width: '1.5rem', height: '1.5rem', fontSize: '9px' },
    default: { width: '1.75rem', height: '1.75rem', fontSize: '10px' },
  };
  const sizeStyle = sizeMap[size] || sizeMap.default;

  if (avatar) {
    return <img alt={name} className="shrink-0 rounded-circle object-fit-cover border border-surface-border" src={avatar} style={sizeStyle} />;
  }

  return (
    <div className="shrink-0 rounded-circle border border-surface-border bg-surface-container-highest d-flex align-items-center justify-content-center fw-bold text-text-muted" style={sizeStyle}>
      {getPatientInitials(name)}
    </div>
  );
};

export default PatientAvatar;
