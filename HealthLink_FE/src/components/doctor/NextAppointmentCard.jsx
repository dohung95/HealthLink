import React from 'react';
import PatientAvatar from '@components/doctor/PatientAvatar';
import {
  STATUS_TONES,
  getPatientName,
  getVisitReason,
  getPatientMeta,
  parseAppointmentDate,
  formatTimeFromDate,
  getTypeIcon,
  getStatusKey,
  getDisplayStatus,
} from '@utils/doctor/appointmentHelpers';

const NextAppointmentCard = ({ appointment, priority, onView, onViewPatient }) => {
  if (!appointment) return null;

  const patientName = getPatientName(appointment);
  const reason = getVisitReason(appointment);
  const patientMeta = getPatientMeta(appointment);
  const appointmentDate = parseAppointmentDate(appointment);
  const diffMinutes = appointmentDate ? Math.round((appointmentDate.getTime() - Date.now()) / 60000) : null;
  const statusKey = getStatusKey(appointment);

  const isInProgress = priority === 'inprogress';
  const isReadyNow = priority === 'readynow';
  const isUpcoming = priority === 'upcoming';

  const handleClick = () => {
    if (isUpcoming) {
      const patientId = appointment.patient?.patientId || appointment.patientId || appointment.patientID;
      if (patientId && onViewPatient) {
        onViewPatient(patientId);
      }
    } else if (onView) {
      onView(appointment);
    }
  };

  const badgeLabel = isInProgress ? 'Live' : isReadyNow ? 'Ready' : null;

  return (
    <div
      className="doctor-next-card"
      style={{ cursor: isUpcoming ? 'pointer' : 'default' }}
      onClick={isUpcoming ? handleClick : undefined}
      role={isUpcoming ? 'button' : undefined}
      tabIndex={isUpcoming ? 0 : undefined}
      onKeyDown={isUpcoming ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } } : undefined}
    >
      <div className="doctor-next-card__header">
        <h2 className="d-flex align-items-center gap-2 mb-0 small fw-bold text-text-main">
          <span className="d-inline-block rounded-circle bg-primary" style={{width:'0.5rem',height:'0.5rem',opacity:0.8}} />
          {isInProgress ? 'In Progress' : isReadyNow ? 'Ready Now' : 'Next Appointment'}
        </h2>
        {badgeLabel ? (
          <span className="badge bg-primary text-white" style={{fontSize:'0.625rem',letterSpacing:'0.05em'}}>
            {badgeLabel}
          </span>
        ) : isUpcoming && diffMinutes != null && diffMinutes >= 0 ? (
          <span className="badge bg-primary text-white" style={{fontSize:'0.625rem',letterSpacing:'0.05em'}}>
            In {diffMinutes < 60 ? `${diffMinutes} mins` : `${Math.round(diffMinutes / 60)} hrs`}
          </span>
        ) : (
          <span className={STATUS_TONES[statusKey]?.badge || 'badge bg-surface-container text-primary'} style={{fontSize:'0.625rem',letterSpacing:'0.05em'}}>
            {getDisplayStatus(appointment)}
          </span>
        )}
      </div>

      <div className="doctor-next-card__body">
        <div className="doctor-next-card__patient-section">
          <div className="d-flex align-items-start gap-3">
            <div className="doctor-next-card__avatar-wrap flex-shrink-0">
              <PatientAvatar appointment={appointment} name={patientName} size="large" />
            </div>
            <div className="flex-grow-1 min-w-0">
              <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                <h3 className="doctor-next-card__patient-name text-truncate mb-0">{patientName}</h3>
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

        {isUpcoming ? (
          <div className="doctor-next-card__actions">
            <small className="text-text-muted">Click to view patient profile</small>
          </div>
        ) : (
          <div className="doctor-next-card__actions">
            <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); onView(appointment); }} type="button">
              <span className="material-symbols-outlined" style={{fontSize:'1rem'}}>open_in_new</span>
              Join Room
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NextAppointmentCard;
