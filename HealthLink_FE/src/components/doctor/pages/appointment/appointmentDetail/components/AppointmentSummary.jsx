import React from 'react';

const AppointmentSummary = ({
  currentAppointment,
  patient,
  patientName,
  patientEmail,
  getStatusClassName,
  getTypeClassName,
  formatCompactDate,
  formatTime,
  calculateAge,
  getPatientInitials,
  loadingVitalSign,
  latestVitalSign,
  visitReason,
}) => (
  <section className="doctor-detail-summary-card">
    <div className="doctor-detail-summary-card__main">
      <div className="doctor-detail-summary-card__main-row">
        <span className="doctor-detail-appointment-id">
          <i className="bi bi-hash"></i>
          {'Appointment ID: '}{currentAppointment?.appointmentID || currentAppointment?.appointmentId || 'N/A'}
        </span>
        <span className={getStatusClassName(currentAppointment?.status)}>
          {currentAppointment?.status || 'Unknown'}
        </span>
      </div>
      <div className="doctor-detail-summary-card__chips">
        <span className={getTypeClassName(currentAppointment?.consultationType)}>
          {currentAppointment?.consultationType || 'Consultation'}
        </span>
        <span className="doctor-detail-chip">
          {formatCompactDate(currentAppointment?.appointmentTime)}
        </span>
        <span className="doctor-detail-chip">
          {formatTime(currentAppointment?.appointmentTime)}
        </span>
      </div>
    </div>

    <div className="doctor-detail-summary-card__visit">
      <div className="doctor-detail-summary-card__visit-header">
        {patient?.avatarUrl ? (
          <img
            className="doctor-detail-avatar doctor-detail-avatar--round"
            src={patient.avatarUrl}
            alt={patientName}
          />
        ) : (
          <div className="doctor-detail-avatar doctor-detail-avatar--fallback doctor-detail-avatar--round">
            {getPatientInitials(patientName)}
          </div>
        )}

        <div className="doctor-detail-summary-card__identity">
          <div className="doctor-detail-summary-card__title-row">
            <h2>{patientName}</h2>
          </div>
          <span className="doctor-detail-summary-card__email">
            {patientEmail}
          </span>
          <div className="doctor-detail-summary-card__meta">
            <span className="doctor-meta-badge">
              <i className="bi bi-cake2"></i>
              {calculateAge(patient?.dateOfBirth)} yrs
            </span>
            <span className="doctor-meta-badge">
              <i className="bi bi-person"></i>
              {patient?.gender || 'Gender N/A'}
            </span>
            <span className="doctor-meta-badge">
              <i className="bi bi-telephone"></i>
              {patient?.phoneNumber || currentAppointment?.patientPhone || 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {loadingVitalSign ? (
        <div className="doctor-vital-section">
          <span className="doctor-vital-badge doctor-vital-badge--loading">
            <span className="spinner-border spinner-border-sm" role="status" />
          </span>
        </div>
      ) : latestVitalSign ? (
        <>
          <div className="doctor-vital-section__header">
            <i className="bi bi-activity"></i>
            <span>Vital Signs</span>
          </div>
          <div className="doctor-vital-section">
            <div className="doctor-vital-strip">
              {latestVitalSign.heartRate ? (
                <span className="doctor-vital-badge" title="Heart rate">
                  <i className="bi bi-heart-pulse"></i>
                  <span className="doctor-vital-badge__value">{latestVitalSign.heartRate}</span>
                  <span className="doctor-vital-badge__unit">bpm</span>
                </span>
              ) : null}
              {latestVitalSign.bloodPressureSystolic ? (
                <span className="doctor-vital-badge" title="Blood pressure">
                  <i className="bi bi-activity"></i>
                  <span className="doctor-vital-badge__value">
                    {latestVitalSign.bloodPressureSystolic}/{latestVitalSign.bloodPressureDiastolic || '?'}
                  </span>
                  <span className="doctor-vital-badge__unit">mmHg</span>
                </span>
              ) : null}
              {latestVitalSign.oxygenSaturation ? (
                <span className="doctor-vital-badge" title="SpO₂">
                  <i className="bi bi-lungs"></i>
                  <span className="doctor-vital-badge__value">{latestVitalSign.oxygenSaturation}</span>
                  <span className="doctor-vital-badge__unit">%</span>
                </span>
              ) : null}
              {latestVitalSign.temperature ? (
                <span className="doctor-vital-badge" title="Temperature">
                  <i className="bi bi-thermometer-half"></i>
                  <span className="doctor-vital-badge__value">{latestVitalSign.temperature}</span>
                  <span className="doctor-vital-badge__unit">°C</span>
                </span>
              ) : null}
              {latestVitalSign.respiratoryRate ? (
                <span className="doctor-vital-badge" title="Respiratory rate">
                  <i className="bi bi-wind"></i>
                  <span className="doctor-vital-badge__value">{latestVitalSign.respiratoryRate}</span>
                  <span className="doctor-vital-badge__unit">br/pm</span>
                </span>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
      <p className="doctor-detail-eyebrow mb-1"><i className="bi bi-chat-dots me-1"></i>Reason for Visit</p>
      <p className={`doctor-detail-summary-card__reason ${visitReason ? '' : 'doctor-detail-summary-card__reason--empty'}`}>
        {visitReason || 'No reason shared yet.'}
      </p>
    </div>
  </section>
);

export default AppointmentSummary;
