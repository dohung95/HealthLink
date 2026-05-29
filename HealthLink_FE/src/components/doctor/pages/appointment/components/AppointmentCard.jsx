import React from 'react';
import PatientAvatar from './PatientAvatar';
import {
  STATUS_TONES,
  TYPE_TONES,
  getPatientName,
  getVisitReason,
  parseAppointmentDate,
  formatTimeFromDate,
  getTypeKey,
  getTypeIcon,
  getStatusKey,
  getDisplayStatus,
  getDurationLabel,
} from './appointmentHelpers';

const AppointmentCard = ({ appointment, onView }) => {
  const patientName = getPatientName(appointment);
  const reason = getVisitReason(appointment);
  const appointmentDate = parseAppointmentDate(appointment);
  const typeKey = getTypeKey(appointment.consultationType);
  const statusKey = getStatusKey(appointment);
  const statusTone = STATUS_TONES[statusKey] || STATUS_TONES.default;

  const actionConfig = {
    inprogress: { label: 'Join Call', active: true },
    scheduled: { label: 'View Details', active: true },
    completed: { label: 'Notes', active: true },
    cancelled: { label: '', active: false },
  };

  const action = actionConfig[statusKey] || actionConfig.scheduled;

  return (
    <article className="doctor-appointment-card" style={{opacity: statusKey === 'completed' || statusKey === 'cancelled' ? '0.65' : '1'}}>
      <div className={`doctor-appointment-card__rail ${statusTone.railClass}`} />

      <div className="doctor-appointment-card__time">
        <div className="doctor-appointment-card__time-value">{formatTimeFromDate(appointmentDate)}</div>
        <div className="doctor-appointment-card__time-duration">{getDurationLabel(appointment)}</div>
      </div>

      <div className="doctor-appointment-card__divider d-none d-md-block" />

      <div className="doctor-appointment-card__patient">
        <PatientAvatar appointment={appointment} name={patientName} size="compact" />
        <div className="doctor-appointment-card__patient-info">
          <p className="doctor-appointment-card__patient-name">{patientName}</p>
          <p className="doctor-appointment-card__patient-reason">{reason || 'Appointment'}</p>
        </div>
      </div>

      <div className="d-flex align-items-center gap-2">
        <span className={`d-inline-flex align-items-center gap-1 ${TYPE_TONES[typeKey] || TYPE_TONES.default}`}>
          <span className="material-symbols-outlined" style={{fontSize:'12px'}}>{getTypeIcon(appointment.consultationType)}</span>
          {appointment.consultationType || 'Consultation'}
        </span>
        <span className={`d-inline-flex align-items-center gap-1 ${statusTone.badge}`}>
          {statusKey === 'inprogress' ? <span className="d-inline-block rounded-circle bg-white" style={{width:'0.375rem',height:'0.375rem',opacity:0.9}} /> : null}
          {getDisplayStatus(appointment)}
        </span>
      </div>

      <div className="flex-shrink-0">
        {action.active ? (
          <button className={`btn btn-sm ${statusKey === 'inprogress' ? 'btn-primary' : statusKey === 'scheduled' ? 'btn-outline-primary' : 'btn-link text-decoration-none'} d-flex align-items-center gap-1`} onClick={() => onView(appointment)} type="button">
            {action.label}
          </button>
        ) : (
          <span className="small text-text-muted fst-italic">No action</span>
        )}
      </div>
    </article>
  );
};

export default AppointmentCard;
