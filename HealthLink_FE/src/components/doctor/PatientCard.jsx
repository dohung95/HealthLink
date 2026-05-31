import React from 'react';
import { useNavigate } from 'react-router-dom';

const formatShortDateTime = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getStatusInfo = (patient) => {
  if (patient.nextAppointmentTime) return { label: 'Upcoming' };
  if (patient.lastAppointmentTime) return { label: 'Recent' };
  return { label: 'Inactive' };
};

const PatientCard = ({ patient }) => {
  const navigate = useNavigate();
  const status = getStatusInfo(patient);

  return (
    <article className="patient-card doctor-stagger-item">
      <div className="patient-card__accent" />
      <div className="patient-card__body">
        <div className="patient-card__header">
          <div className="patient-card__info">
            <div className="patient-avatar">
              {patient.avatarUrl ? (
                <img alt="" src={patient.avatarUrl} />
              ) : (
                <span>{(patient.fullName || 'P').charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="patient-card__meta">
              <h4 className="patient-card__name">{patient.fullName}</h4>
              <p className="patient-card__contact">{patient.email || patient.phoneNumber || 'No contact listed'}</p>
            </div>
          </div>
          <span className={`patient-status patient-status--${status.label.toLowerCase()}`}>
            {status.label}
          </span>
        </div>

        <div className="patient-card__metrics">
          <div className="patient-card__metric">
            <span className="patient-card__metric-label">Total</span>
            <strong className="patient-card__metric-value">{patient.totalAppointments ?? 0}</strong>
          </div>
          <div className="patient-card__metric-divider" />
          <div className="patient-card__metric">
            <span className="patient-card__metric-label">Completed</span>
            <strong className="patient-card__metric-value">{patient.completedAppointments ?? 0}</strong>
          </div>
        </div>

        <div className="patient-card__dates">
          <div className="patient-card__date">
            <span className="material-symbols-outlined">event</span>
            <span className="patient-card__date-label">Next</span>
            <span className="patient-card__date-value">{formatShortDateTime(patient.nextAppointmentTime) || '\u2014'}</span>
          </div>
          <div className="patient-card__date">
            <span className="material-symbols-outlined">history</span>
            <span className="patient-card__date-label">Last</span>
            <span className="patient-card__date-value">{formatShortDateTime(patient.lastAppointmentTime) || '\u2014'}</span>
          </div>
        </div>

        <button
          type="button"
          className="patient-card__action"
          onClick={() => navigate(`/doctor/patients/${patient.patientId}`)}
        >
          View Patient
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </div>
    </article>
  );
};

export default PatientCard;
