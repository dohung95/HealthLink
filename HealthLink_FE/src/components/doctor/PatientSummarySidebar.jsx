import React from 'react';

const VitalBadge = ({ icon, value, unit }) => (
  <div className="patient-sidebar-vital">
    <i className={`bi ${icon}`}></i>
    <span className="patient-sidebar-vital__value">{value}</span>
    {unit && <span className="patient-sidebar-vital__unit">{unit}</span>}
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

      {allergies.length > 0 && (
        <div className="patient-sidebar__section patient-sidebar__section--allergies">
          <p className="patient-sidebar__label">
            <i className="bi bi-exclamation-triangle-fill" style={{color:'var(--warning)',marginRight:'0.25rem'}}></i>
            Allergies
          </p>
          <div className="patient-sidebar__allergy-pills">
            {allergies.map((a, i) => (
              <span key={i} className="patient-sidebar__allergy-pill">{a}</span>
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
          </div>
        ) : (
          <p className="patient-sidebar__empty-text">No vitals recorded</p>
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
