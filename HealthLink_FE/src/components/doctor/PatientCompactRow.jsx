import React from 'react';

const getStatusInfo = (patient) => {
  if (patient.nextAppointmentTime) return { key: 'upcoming', label: 'Upcoming' };
  if (patient.lastAppointmentTime) return { key: 'recent', label: 'Recent' };
  return { key: 'inactive', label: 'Inactive' };
};

const PatientCompactRow = ({ patient, isActive, onSelect, style }) => {
  if (!patient) return null;
  const status = getStatusInfo(patient);

  return (
    <div
      className={`patient-compact-row${isActive ? ' patient-compact-row--active' : ''}`}
      onClick={() => onSelect(patient.patientId)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(patient.patientId); }}
      style={style}
    >
      <div className="patient-compact-row__avatar">
        {patient.avatarUrl ? (
          <img alt="" src={patient.avatarUrl} />
        ) : (
          <span>{(patient.fullName || 'P').charAt(0).toUpperCase()}</span>
        )}
      </div>
      <div className="patient-compact-row__info">
        <p className="patient-compact-row__name">{patient.fullName}</p>
        <p className="patient-compact-row__phone">
          <span className="material-symbols-outlined">call</span>
          {patient.phoneNumber || '\u2014'}
        </p>
      </div>
      <div className={`patient-compact-row__status patient-compact-row__status--${status.key}`} title={status.label} />
    </div>
  );
};

export default PatientCompactRow;
