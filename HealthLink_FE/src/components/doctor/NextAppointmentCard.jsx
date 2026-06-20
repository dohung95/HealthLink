import React from 'react';
import PatientAvatar from '@components/doctor/PatientAvatar';
import {
  STATUS_TONES,
  getPatientName,
  getVisitReason,
  getPatientMeta,
  parseAppointmentDate,
  formatTimeFromDate,
  formatShortDate,
  getTypeIcon,
  getStatusKey,
  getDisplayStatus,
} from '@utils/doctor/appointmentHelpers';

const NextAppointmentCard = ({ appointment, onView, selectedDate }) => {
  const patientName = appointment ? getPatientName(appointment) : '';
  const reason = appointment ? getVisitReason(appointment) : null;
  const patientMeta = appointment ? getPatientMeta(appointment) : null;
  const appointmentDate = appointment ? parseAppointmentDate(appointment) : null;
  const diffMinutes = appointmentDate ? Math.round((appointmentDate.getTime() - Date.now()) / 60000) : null;
  const statusKey = appointment ? getStatusKey(appointment) : null;

  return (
    <div className="doctor-next-card">
      <div className="doctor-next-card__header">
        <h2 className="d-flex align-items-center gap-2 mb-0 small fw-bold text-text-main">
          <span className="d-inline-block rounded-circle bg-primary" style={{width:'0.5rem',height:'0.5rem',opacity:0.8}} />
          Next Appointment
        </h2>
        {appointment ? (
          diffMinutes != null && diffMinutes >= 0 ? (
            <span className="badge bg-primary text-white" style={{fontSize:'0.625rem',letterSpacing:'0.05em'}}>
              In {diffMinutes < 60 ? `${diffMinutes} mins` : `${Math.round(diffMinutes / 60)} hrs`}
            </span>
          ) : (
            <span className={STATUS_TONES[statusKey]?.badge || 'badge bg-surface-container text-text-main'} style={{fontSize:'0.625rem',letterSpacing:'0.05em'}}>{getDisplayStatus(appointment)}</span>
          )
        ) : (
          <span className="badge bg-surface-container text-text-main" style={{fontSize:'0.625rem',letterSpacing:'0.05em'}}>No upcoming</span>
        )}
      </div>

      {appointment ? (
        <div className="doctor-next-card__body">
          <div className="doctor-next-card__patient-section">
            <div className="d-flex align-items-start gap-3">
              <div className="doctor-next-card__avatar-wrap flex-shrink-0">
                <PatientAvatar appointment={appointment} name={patientName} size="large" />
              </div>
              <div className="flex-grow-1 min-w-0">
                <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                  <h3 className="doctor-next-card__patient-name text-truncate mb-0">{patientName}</h3>
                  -
                  {patientMeta && (
                    <span className="doctor-next-card__patient-meta flex-shrink-0">
                      {patientMeta}
                    </span>
                  )}
                </div>

                <div className="d-flex flex-wrap gap-2 pb-4">
                  <span className="doctor-next-card__info-item">
                    <span className="material-symbols-outlined">schedule</span>
                    {formatTimeFromDate(appointmentDate)}
                  </span>
                  <span className="doctor-next-card__info-item">
                    <span className="material-symbols-outlined">{getTypeIcon(appointment.consultationType)}</span>
                    {appointment.consultationType || 'Consultation'}
                  </span>
                </div>

                <div className="doctor-next-card__reason">
                  <span className="doctor-next-card__reason-label">Visit Reason</span>
                  <p className="doctor-next-card__reason-text mb-0">{reason || 'Not provided'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="doctor-next-card__actions">
            <button className="btn btn-primary" onClick={() => onView(appointment)} type="button">
              <span className="material-symbols-outlined" style={{fontSize:'1rem'}}>open_in_new</span>
              Open Detail
            </button>
            <button className="btn btn-outline-primary" onClick={() => onView(appointment)} type="button">
              <span className="material-symbols-outlined" style={{fontSize:'1rem'}}>description</span>
              Medical History
            </button>
          </div>
        </div>
      ) : (
        <div className="doctor-next-card__body doctor-next-card__body--empty">
          <div className="doctor-next-card__empty">
            <span className="material-symbols-outlined fs-2 text-text-muted">event_available</span>
            <h3 className="mb-1 mt-2 fs-6 fw-semibold text-text-main">No upcoming appointment</h3>
            <p className="mb-0 small text-text-muted">{formatShortDate(selectedDate)}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default NextAppointmentCard;
