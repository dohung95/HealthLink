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
}) => {
  const bmi = patient?.heightCm && patient?.weightKg
    ? (patient.weightKg / ((patient.heightCm / 100) ** 2)).toFixed(1)
    : null;

  return (
    <section className="doctor-detail-summary">
      {/* Section 1 — Header */}
      <div className="doctor-detail-summary__section doctor-detail-summary__header">
        <div className="doctor-detail-summary__main-row">
          <span className="doctor-detail-appointment-id">
            <i className="bi bi-hash"></i>
            {'Appointment ID: '}{currentAppointment?.appointmentID || currentAppointment?.appointmentId || 'N/A'}
          </span>
          <span className={getStatusClassName(currentAppointment?.status)}>
            {currentAppointment?.status || 'Unknown'}
          </span>
        </div>
        <div className="doctor-detail-summary__chips">
          <span className={getTypeClassName(currentAppointment?.consultationType)}>
            {currentAppointment?.consultationType || 'Consultation'}
          </span>
          <span className="doctor-detail-chip">
            <i className="bi bi-calendar3"></i>
            {formatCompactDate(currentAppointment?.appointmentTime)}
          </span>
          <span className="doctor-detail-chip">
            <i className="bi bi-clock"></i>
            {formatTime(currentAppointment?.appointmentTime)}
          </span>
        </div>
      </div>

      {/* Section 2 — Grid: Patient | Vitals */}
      <div className="doctor-detail-summary__section">
        <div className="doctor-detail-summary__grid">
          {/* Cột trái — Patient */}
            <div className="doctor-detail-summary__patient">
              <div className="doctor-detail-summary__card">
                <div className="doctor-detail-summary__visit-header">
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

              <div className="doctor-detail-summary__identity">
                <div className="doctor-detail-summary__title-row">
                  <h2>{patientName}</h2>
                </div>
                <span className="doctor-detail-summary__email">
                  <i className="bi bi-envelope"></i>
                  {patientEmail}
                </span>
                <div className="doctor-detail-summary__meta">
                  <span className="doctor-meta-badge">
                    <i className="bi bi-cake2"></i>
                    {calculateAge(patient?.dateOfBirth)} yrs
                  </span>
                  <span className="doctor-meta-badge">
                    <i className="bi bi-gender-ambiguous"></i>
                    {patient?.gender || 'N/A'}
                  </span>
                  <span className="doctor-meta-badge">
                    <i className="bi bi-telephone"></i>
                    {patient?.phoneNumber || currentAppointment?.patientPhone || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
            </div>

            <div className="doctor-detail-summary__card">
            <div className="doctor-detail-summary__emergency">
              <p className="doctor-detail-eyebrow">Emergency Contact</p>
              <div className="doctor-detail-summary__emergency-row">
                <i className="bi bi-person"></i>
                <span>{patient?.emergencyContactName || 'N/A'}</span>
                {patient?.emergencyContactRelationship ? (
                  <span className="doctor-detail-summary__emergency-rel">({patient.emergencyContactRelationship})</span>
                ) : null}
              </div>
              <div className="doctor-detail-summary__emergency-row">
                <i className="bi bi-telephone"></i>
                <span>{patient?.emergencyContactPhone || 'N/A'}</span>
              </div>
              <div className="doctor-detail-summary__emergency-row">
                <i className="bi bi-envelope"></i>
                <span>{patient?.emergencyContactEmail || 'N/A'}</span>
              </div>
            </div>
            </div>
          </div>

          {/* Cột phải — Vital Signs */}
          <div className="doctor-detail-summary__vitals">
            {loadingVitalSign ? (
              <div className="doctor-detail-summary__vitals-card">
                <div className="doctor-vital-badge doctor-vital-badge--loading">
                  <span className="spinner-border spinner-border-sm" role="status" />
                </div>
              </div>
            ) : latestVitalSign ? (
              <div className="doctor-detail-summary__vitals-card">
                <div className="doctor-vital-section__header">
                  <i className="bi bi-activity"></i>
                  <span>Vital Signs</span>
                </div>
                <div className="doctor-vital-strip--vertical">
                  <div className="doctor-vital-strip__column">
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
                  </div>
                  <div className="doctor-vital-strip__column">
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
                    {patient?.bloodType ? (
                      <span className="doctor-vital-badge" title="Blood type">
                        <i className="bi bi-droplet"></i>
                        <span className="doctor-vital-badge__value">{patient.bloodType}</span>
                      </span>
                    ) : null}
                  </div>
                </div>

                {(patient?.heightCm || patient?.weightKg) ? (
                  <>
                    <div className="doctor-vital-section__header" style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)' }}>
                      <i className="bi bi-graph-up"></i>
                      <span>Body Metrics</span>
                    </div>
                    <div className="doctor-detail-summary__body-metrics">
                      {patient?.heightCm && (
                        <span className="doctor-vital-badge" title="Height">
                          <i className="bi bi-arrows-vertical"></i>
                          <span className="doctor-vital-badge__value">{patient.heightCm}</span>
                          <span className="doctor-vital-badge__unit">cm</span>
                        </span>
                      )}
                      {patient?.weightKg && (
                        <span className="doctor-vital-badge" title="Weight">
                          <i className="bi bi-circle-fill"></i>
                          <span className="doctor-vital-badge__value">{patient.weightKg}</span>
                          <span className="doctor-vital-badge__unit">kg</span>
                        </span>
                      )}
                      {bmi && (
                        <span className="doctor-vital-badge" title="BMI">
                          <i className="bi bi-calculator"></i>
                          <span className="doctor-vital-badge__value">{bmi}</span>
                        </span>
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}

            {patient?.allergies ? (
              <div className="doctor-detail-summary__card doctor-detail-summary__card--allergies">
                <div className="doctor-detail-summary__allergies">
                  <span className="doctor-detail-eyebrow"><i className="bi bi-exclamation-triangle-fill"></i> Allergies</span>
                  <div className="doctor-detail-summary__allergy-pills">
                    {patient.allergies.split(',').map((a, i) => (
                      <span key={i} className="doctor-detail-summary__allergy-pill">{a.trim()}</span>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Section 3 — Reason for Visit */}
      <div className="doctor-detail-summary__section doctor-detail-summary__reason-section">
        <p className="doctor-detail-eyebrow"><i className="bi bi-chat-dots me-1"></i>Reason for Visit</p>
        <p className={`doctor-detail-summary__reason ${visitReason ? '' : 'doctor-detail-summary__reason--empty'}`}>
          {visitReason || 'No reason shared yet.'}
        </p>
      </div>
    </section>
  );
};

export default AppointmentSummary;
