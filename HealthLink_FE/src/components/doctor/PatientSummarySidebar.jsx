import React from 'react';

const VitalBadge = ({ icon, value, unit, warning }) => (
  <div className={`doctor-vital-badge${warning ? ' doctor-vital-badge--warning' : ''}`}>
    <i className={`bi ${icon}`}></i>
    <span className="doctor-vital-badge__value">{value}</span>
    {unit && <span className="doctor-vital-badge__unit">{unit}</span>}
  </div>
);

const PatientSummarySidebar = ({
  patient,
  patientName,
  visitReason,
  latestVitalSign,
  loadingVitalSign,
}) => {
  const allergies = patient?.allergies
    ? patient.allergies.split(',').map((a) => a.trim()).filter(Boolean)
    : [];

  const bmi = patient?.heightCm && patient?.weightKg
    ? (patient.weightKg / ((patient.heightCm / 100) ** 2)).toFixed(1)
    : null;

  return (
    <aside className="patient-sidebar">
      <div className="patient-sidebar__section">
        <div className="patient-sidebar__patient-row">
          {patient?.avatarUrl ? (
            <img className="patient-sidebar__avatar" src={patient.avatarUrl} alt={patientName} />
          ) : (
            <div className="patient-sidebar__avatar patient-sidebar__avatar--fallback">
              {patientName?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
          <div className="patient-sidebar__identity">
            <h3 className="patient-sidebar__name">{patientName}</h3>
            <span className="patient-sidebar__meta">
              {patient?.gender || 'N/A'} &middot; {calculateAge(patient?.dateOfBirth)} yrs
            </span>
          </div>
        </div>
      </div>

      <div className="patient-sidebar__section">
        <p className="patient-sidebar__label">Visit Reason</p>
        <p className={`patient-sidebar__reason ${!visitReason ? 'patient-sidebar__reason--empty' : ''}`}>
          {visitReason || 'Not provided'}
        </p>
      </div>

      <div className="patient-sidebar__section">
        <p className="patient-sidebar__label">
          <i className="bi bi-telephone me-1"></i>Phone
        </p>
        <p className="patient-sidebar__text">
          {patient?.phoneNumber || 'N/A'}
        </p>
      </div>

      {allergies.length > 0 && (
        <div className="patient-sidebar__section patient-sidebar__section--allergies">
          <p className="patient-sidebar__label">
            <i className="bi bi-exclamation-triangle-fill" style={{color:'var(--doctor-warning)',marginRight:'0.25rem'}}></i>
            Allergies
          </p>
          <div className="patient-sidebar__allergy-pills">
            {allergies.map((a, i) => (
              <span key={i} className="patient-sidebar__allergy-pill"><i className="bi bi-dot"></i>{a}</span>
            ))}
          </div>
        </div>
      )}

      <div className="patient-sidebar__section">
        <p className="patient-sidebar__label">
          <i className="bi bi-activity me-1"></i>Vitals
        </p>
        {loadingVitalSign ? (
          <div className="text-center py-2">
            <div className="spinner-border spinner-border-sm text-primary" role="status" />
          </div>
        ) : latestVitalSign ? (
          <div className="patient-sidebar__vitals-grid">
            {latestVitalSign.heartRate && (
              <VitalBadge icon="bi-heart-pulse" value={latestVitalSign.heartRate} unit="bpm" />
            )}
            {latestVitalSign.bloodPressureSystolic && (
              <VitalBadge
                icon="bi-activity"
                value={`${latestVitalSign.bloodPressureSystolic}/${latestVitalSign.bloodPressureDiastolic || '?'}`}
                unit="mmHg"
              />
            )}
            {latestVitalSign.oxygenSaturation && (
              <VitalBadge icon="bi-lungs" value={latestVitalSign.oxygenSaturation} unit="%" />
            )}
            {latestVitalSign.temperature && (
              <VitalBadge icon="bi-thermometer-half" value={latestVitalSign.temperature} unit="°C" />
            )}
            {latestVitalSign.respiratoryRate && (
              <VitalBadge icon="bi-wind" value={latestVitalSign.respiratoryRate} unit="br/pm" />
            )}
            {patient?.bloodType && (
              <VitalBadge icon="bi-droplet" value={patient.bloodType} />
            )}
          </div>
        ) : (
          <p className="patient-sidebar__empty-text">No vitals recorded</p>
        )}

        {(patient?.heightCm || patient?.weightKg) && (
          <>
            <div className="patient-sidebar__divider" />
            <p className="patient-sidebar__label">
              <i className="bi bi-graph-up me-1"></i>Body Metrics
            </p>
            <div className="patient-sidebar__vitals-grid">
              {patient?.heightCm && (
                <VitalBadge icon="bi-arrows-vertical" value={patient.heightCm} unit="cm" />
              )}
              {patient?.weightKg && (
                <VitalBadge icon="bi-circle-fill" value={patient.weightKg} unit="kg" />
              )}
              {bmi && (
                <VitalBadge icon="bi-calculator" value={bmi} />
              )}
            </div>
          </>
        )}
      </div>

      {patient?.emergencyContactName && (
        <div className="patient-sidebar__section">
          <p className="patient-sidebar__label">
            <i className="bi bi-telephone me-1"></i>Emergency Contact
          </p>
          <p className="patient-sidebar__text">{patient.emergencyContactName}</p>
          {patient.emergencyContactPhone && (
            <p className="patient-sidebar__text patient-sidebar__text--small">{patient.emergencyContactPhone}</p>
          )}
        </div>
      )}
    </aside>
  );
};

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return '?';
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return '?';
  const diff = Date.now() - dob.getTime();
  return Math.floor(diff / 31557600000);
}

export default PatientSummarySidebar;
