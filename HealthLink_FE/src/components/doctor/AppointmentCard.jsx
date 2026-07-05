import React from 'react';
import PatientAvatar from '@components/doctor/PatientAvatar';
import {
  STATUS_TONES,
  TYPE_TONES,
  getPatientName,
  getPatientPhone,
  parseAppointmentDate,
  formatTimeFromDate,
  getTypeKey,
  getTypeIcon,
  getStatusKey,
  getDisplayStatus,
  getDurationLabel,
} from '@utils/doctor/appointmentHelpers';

const AppointmentCard = ({ appointment, onView, compact }) => {
  const patientName = getPatientName(appointment);
  const phone = getPatientPhone(appointment);
  const appointmentDate = parseAppointmentDate(appointment);
  const typeKey = getTypeKey(appointment.consultationType);
  const statusKey = getStatusKey(appointment);
  const statusTone = STATUS_TONES[statusKey] || STATUS_TONES.default;
  const appointmentId = appointment?.appointmentID || appointment?.appointmentId || '';

  return (
    <article
      className={`doctor-appointment-card${compact ? ' doctor-appointment-card--compact' : ''}`}
      style={{cursor: 'pointer'}}
      onClick={() => onView(appointment)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onView(appointment); } }}
    >
      <div className={`doctor-appointment-card__rail ${statusTone.railClass}`} />

      {compact && <span className="doctor-appointment-card__appt-id">#{appointmentId}</span>}

      {!compact && (
        <>
          {/* Col 1: Time */}
          <div className="doctor-appointment-card__time">
            <div className="doctor-appointment-card__time-value">{formatTimeFromDate(appointmentDate)}</div>
            <div className="doctor-appointment-card__time-duration">{getDurationLabel(appointment)}</div>
          </div>

          <div className="doctor-appointment-card__divider" aria-hidden="true" />
        </>
      )}

      {/* Col 2: Patient (avatar + name + phone) */}
      <div className="doctor-appointment-card__patient">
        <PatientAvatar appointment={appointment} name={patientName} size="compact" />
        <div className="doctor-appointment-card__patient-info">
          <p className="doctor-appointment-card__patient-name">{patientName}</p>
          {phone ? (
            <p className="doctor-appointment-card__patient-phone">{phone}</p>
          ) : null}
        </div>
      </div>

      {/* Col 3: Type badge */}
      <div className="doctor-appointment-card__type">
        <span className={`d-inline-flex align-items-center gap-1 ${TYPE_TONES[typeKey] || TYPE_TONES.default}`}>
          <span className="material-symbols-outlined" style={{fontSize:'12px'}}>{getTypeIcon(appointment.consultationType)}</span>
          {appointment.consultationType || 'Consultation'}
        </span>
      </div>

      {/* Col 4: Status badge */}
      <div className="doctor-appointment-card__status">
        <span className={`d-inline-flex align-items-center gap-1 ${statusTone.badge}`}>
          {statusKey === 'inprogress' ? <span className="d-inline-block rounded-circle bg-white" style={{width:'0.375rem',height:'0.375rem',opacity:0.9}} /> : null}
          {getDisplayStatus(appointment)}
        </span>
      </div>
    </article>
  );
};

export default AppointmentCard;
