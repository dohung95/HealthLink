import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { vitalSignApi } from '@api/vitalSignApi';
import { useAuth } from '@context/AuthContext';

const formatDateTime = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'timeline', label: 'Timeline' },
];

const InfoField = ({ label, value, larger }) => (
  <div className={`patient-info-field${larger ? ' patient-info-field--larger' : ''}`}>
    <span className="patient-info-field__label">{label}</span>
    <span className="patient-info-field__value">{value || 'N/A'}</span>
  </div>
);

const TIMELINE_PAGE_SIZE = 7;

export default function DoctorPatientDetailView({ patient, history, doctorId }) {
  const navigate = useNavigate();
  const { currentUserId, user: authUser } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [timelinePage, setTimelinePage] = useState(1);
  const [vitalSigns, setVitalSigns] = useState(null);
  const [loadingVitals, setLoadingVitals] = useState(true);
  useEffect(() => {
    const pid = patient?.id || patient?.patientId || patient?.patientID || patient?.userId;
    if (!pid) return;
    let mounted = true;
    setLoadingVitals(true);
    vitalSignApi.getPatientVitalSigns(pid)
      .then((res) => {
        if (!mounted) return;
        const latest = Array.isArray(res) ? res[0] : res;
        setVitalSigns(latest);
      })
      .catch(() => {
        if (mounted) setVitalSigns(null);
      })
      .finally(() => {
        if (mounted) setLoadingVitals(false);
      });
    return () => { mounted = false; };
  }, [patient?.id, patient?.patientId]);

  if (!patient) return null;

  const completedAppointments = (history?.appointments || [])
    .filter((a) => String(a.status || '').toLowerCase() === 'completed');

  const data = history || patient;

  const MOCK_HEIGHT = 172;
  const MOCK_WEIGHT = 68;
  const patientHeight = patient?.heightCm || MOCK_HEIGHT;
  const patientWeight = patient?.weightKg || MOCK_WEIGHT;
  const bmi = patientHeight && patientWeight
    ? (patientWeight / ((patientHeight / 100) ** 2)).toFixed(1)
    : null;

  const vitalsDisplay = vitalSigns;

  const allergyCount = patient?.allergies
    ? patient.allergies.split(',').filter(Boolean).length
    : 0;
  const chronicCount = patient?.chronicConditions
    ? patient.chronicConditions.split(',').filter(Boolean).length
    : 0;

  const STATS = [
    { icon: 'calendar_month', count: completedAppointments.length, label: 'Visits', accent: 'var(--doctor-primary)' },
    { icon: 'prescriptions', count: history?.prescriptions?.length || 0, label: 'Prescriptions', accent: 'var(--doctor-success)' },
    { icon: 'monitor_heart', count: chronicCount, label: 'Chronic Cond.', accent: 'var(--doctor-warning)' },
    { icon: 'warning', count: allergyCount, label: 'Allergies', accent: 'var(--doctor-error)' },
  ];

  const renderOverview = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* ---- Stat strip ---- */}
      <div className="overview-stats-strip">
        {STATS.map((s, i) => (
          <div key={i} className="overview-stat-card" style={{ '--stat-accent': s.accent }}>
            <span className="overview-stat-card__icon">
              <span className="material-symbols-outlined">{s.icon}</span>
            </span>
            <div className="overview-stat-card__content">
              <span className="overview-stat-card__number">{s.count}</span>
              <span className="overview-stat-card__label">{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ---- Two-column grid: Patient Info | Vital Signs ---- */}
      <div className="patient-info__split">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div className="patient-info__card">
            <div className="patient-info__card-header">
              <span>Patient Information</span>
            </div>
            <div className="patient-info__card-grid">
              <div className="patient-info__card-col">
                <div className="patient-info__card-col-inner">
                  <div className="patient-info__card-subcol">
                    <div className="patient-info__row">
                      <span className="patient-info__row-icon-wrap">
                        <span className="material-symbols-outlined patient-info__row-icon">wc</span>
                      </span>
                      <div className="patient-info__row-content">
                        <span className="patient-info__label">Gender</span>
                        <span className="patient-info__value">{data.gender || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="patient-info__row">
                      <span className="patient-info__row-icon-wrap">
                        <span className="material-symbols-outlined patient-info__row-icon">call</span>
                      </span>
                      <div className="patient-info__row-content">
                        <span className="patient-info__label">Phone</span>
                        <span className="patient-info__value">{data.phoneNumber || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="patient-info__card-subcol">
                    <div className="patient-info__row">
                      <span className="patient-info__row-icon-wrap">
                        <span className="material-symbols-outlined patient-info__row-icon">bloodtype</span>
                      </span>
                      <div className="patient-info__row-content">
                        <span className="patient-info__label">Blood Type</span>
                        <span className="patient-info__value">{data.bloodType || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="patient-info__row">
                      <span className="patient-info__row-icon-wrap">
                        <span className="material-symbols-outlined patient-info__row-icon">cake</span>
                      </span>
                      <div className="patient-info__row-content">
                        <span className="patient-info__label">Date of Birth</span>
                        <span className="patient-info__value">
                          {data.dateOfBirth
                            ? new Date(data.dateOfBirth).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })
                            : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="patient-info__card-col patient-info__card-col--allergies">
                <div className="patient-info__row">
                  <span className="patient-info__row-icon-wrap">
                    <span className="material-symbols-outlined patient-info__row-icon patient-info__row-icon--danger">warning</span>
                  </span>
                  <div className="patient-info__row-content">
                    <span className="patient-info__label">Allergies</span>
                    <div className="patient-info__allergy-list">
                      {(patient?.allergies || '')
                        .split(',')
                        .filter(Boolean)
                        .map((a, i) => (
                          <span key={i} className="patient-info__allergy-pill">{a.trim()}</span>
                        ))}
                      {!patient?.allergies && <span className="patient-info__value">None</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="patient-info__emcontact">
            <div className="patient-info__emcontact-header">
              <span>Emergency Contact</span>
            </div>
            {patient?.emergencyContactName ? (
              <div className="patient-info__emcontact-grid">
                <div className="patient-info__emcontact-col">
                  <div className="patient-info__emcontact-row">
                    <span className="patient-info__row-icon-wrap">
                      <span className="material-symbols-outlined patient-info__row-icon">person</span>
                    </span>
                    <div className="patient-info__row-content">
                      <span className="patient-info__label">Name</span>
                      <span className="patient-info__value">{patient.emergencyContactName}</span>
                    </div>
                  </div>
                  {patient.emergencyContactRelationship && (
                    <div className="patient-info__emcontact-row">
                      <span className="patient-info__row-icon-wrap">
                        <span className="material-symbols-outlined patient-info__row-icon">badge</span>
                      </span>
                      <div className="patient-info__row-content">
                        <span className="patient-info__label">Role</span>
                        <span className="patient-info__value">{patient.emergencyContactRelationship}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="patient-info__emcontact-col">
                  <div className="patient-info__emcontact-row">
                    <span className="patient-info__row-icon-wrap">
                      <span className="material-symbols-outlined patient-info__row-icon">call</span>
                    </span>
                    <div className="patient-info__row-content">
                      <span className="patient-info__label">Phone</span>
                      <span className="patient-info__value">{patient.emergencyContactPhone || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="patient-info__emcontact-empty">
                <span className="material-symbols-outlined">add_circle</span>
                <div>
                  <span className="patient-info__emcontact-empty-title">No emergency contact</span>
                  <span className="patient-info__emcontact-empty-desc">Patient has not provided one yet</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ---- Vital Signs card ---- */}
        <div className="doctor-detail-summary__vitals">
          <div className="doctor-detail-summary__vitals-card">
            <div className="doctor-vital-section__header">
              <i className="bi bi-activity"></i>
              <span>Vital Signs</span>
            </div>
            {loadingVitals ? (
              <div className="doctor-vital-badge doctor-vital-badge--loading">
                <span className="spinner-border spinner-border-sm" role="status" />
              </div>
            ) : !vitalsDisplay ? (
              <p className="patient-sidebar__empty-text text-center text-muted mt-3 mb-3">No vitals recorded</p>
            ) : (
              <>
                <div className="doctor-vital-strip--vertical">
                  <div className="doctor-vital-strip__column">
                    {vitalsDisplay.heartRate && (
                      <span className="doctor-vital-badge" title="Heart rate">
                        <i className="bi bi-heart-pulse"></i>
                        <span className="doctor-vital-badge__value">{vitalsDisplay.heartRate}</span>
                        <span className="doctor-vital-badge__unit">bpm</span>
                      </span>
                    )}
                    {vitalsDisplay.bloodPressureSystolic && (
                      <span className="doctor-vital-badge" title="Blood pressure">
                        <i className="bi bi-activity"></i>
                        <span className="doctor-vital-badge__value">{vitalsDisplay.bloodPressureSystolic}/{vitalsDisplay.bloodPressureDiastolic || '?'}</span>
                        <span className="doctor-vital-badge__unit">mmHg</span>
                      </span>
                    )}
                    {vitalsDisplay.oxygenSaturation && (
                      <span className="doctor-vital-badge" title="SpO₂">
                        <i className="bi bi-lungs"></i>
                        <span className="doctor-vital-badge__value">{vitalsDisplay.oxygenSaturation}</span>
                        <span className="doctor-vital-badge__unit">%</span>
                      </span>
                    )}
                  </div>
                  <div className="doctor-vital-strip__column">
                    {vitalsDisplay.temperature && (
                      <span className="doctor-vital-badge" title="Temperature">
                        <i className="bi bi-thermometer-half"></i>
                        <span className="doctor-vital-badge__value">{vitalsDisplay.temperature}</span>
                        <span className="doctor-vital-badge__unit">°C</span>
                      </span>
                    )}
                    {vitalsDisplay.respiratoryRate && (
                      <span className="doctor-vital-badge" title="Respiratory rate">
                        <i className="bi bi-wind"></i>
                        <span className="doctor-vital-badge__value">{vitalsDisplay.respiratoryRate}</span>
                        <span className="doctor-vital-badge__unit">br/pm</span>
                      </span>
                    )}
                    {data.bloodType && (
                      <span className="doctor-vital-badge" title="Blood type">
                        <i className="bi bi-droplet"></i>
                        <span className="doctor-vital-badge__value">{data.bloodType}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="doctor-vital-section__header" style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--doctor-border-light)' }}>
                  <i className="bi bi-graph-up"></i>
                  <span>Body Metrics</span>
                </div>
                <div className="doctor-detail-summary__body-metrics">
                  <span className="doctor-vital-badge" title="Height">
                    <i className="bi bi-arrows-vertical"></i>
                    <span className="doctor-vital-badge__value">{patientHeight}</span>
                    <span className="doctor-vital-badge__unit">cm</span>
                  </span>
                  <span className="doctor-vital-badge" title="Weight">
                    <i className="bi bi-circle-fill"></i>
                    <span className="doctor-vital-badge__value">{patientWeight}</span>
                    <span className="doctor-vital-badge__unit">kg</span>
                  </span>
                  {bmi && (
                    <span className="doctor-vital-badge" title="BMI">
                      <i className="bi bi-calculator"></i>
                      <span className="doctor-vital-badge__value">{bmi}</span>
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const allTimelineItems = (history?.appointments || [])
    .filter((item) => String(item.status || '').toLowerCase() === 'completed')
    .map((item) => ({
      date: item.appointmentTime,
      consultationType: item.consultationType || 'Consultation',
      appointmentId: item.appointmentId,
    }))
    .sort((left, right) => new Date(right.date || 0) - new Date(left.date || 0));

  const timelineTotalPages = Math.max(1, Math.ceil(allTimelineItems.length / TIMELINE_PAGE_SIZE));
  const safeTimelinePage = Math.min(timelinePage, timelineTotalPages);
  const timelineItems = allTimelineItems.slice(
    (safeTimelinePage - 1) * TIMELINE_PAGE_SIZE,
    safeTimelinePage * TIMELINE_PAGE_SIZE
  );

  const renderTimelinePagination = () => (
    timelineTotalPages > 1 ? (
      <div className="d-flex align-items-center justify-content-center gap-2 pt-2" style={{ borderTop: '1px solid var(--doctor-border-light)' }}>
        <button
          type="button"
          className="btn btn-sm btn-outline-primary tl-page-btn"
          style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', background: 'transparent' }}
          disabled={safeTimelinePage <= 1}
          onClick={() => setTimelinePage((p) => Math.max(1, p - 1))}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '0.75rem' }}>chevron_left</span>
          Prev
        </button>
        <span style={{ fontSize: '0.75rem', color: 'var(--doctor-text-muted)', whiteSpace: 'nowrap' }}>
          {safeTimelinePage} / {timelineTotalPages}
        </span>
        <button
          type="button"
          className="btn btn-sm btn-outline-primary tl-page-btn"
          style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', background: 'transparent' }}
          disabled={safeTimelinePage >= timelineTotalPages}
          onClick={() => setTimelinePage((p) => Math.min(timelineTotalPages, p + 1))}
        >
          Next
          <span className="material-symbols-outlined" style={{ fontSize: '0.75rem' }}>chevron_right</span>
        </button>
      </div>
    ) : null
  );

  const renderTimeline = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
      <p className="patient-section-title" style={{ margin: 0 }}>Timeline</p>
      {allTimelineItems.length === 0 ? (
        <p style={{ fontSize: '0.8rem', color: 'var(--doctor-text-muted)' }}>No completed appointments yet.</p>
      ) : (
        <>
          {timelineItems.map((item, idx) => (
            <div className="patient-timeline-item" key={idx}>
              <span className="patient-timeline-item__title">{formatDateTime(item.date)}</span>
              <span className="patient-timeline-item__type patient-timeline-item__type--pill">
                {item.consultationType}
              </span>
              <span className="patient-timeline-item__encounter-label badge bg-success text-white" style={{fontSize:'0.7rem',fontWeight:600}}>Completed</span>
              <button
                className="patient-timeline-item__action"
                onClick={() => navigate('/doctor/appointments/history', { state: { selectedAppointmentId: item.appointmentId } })}
                type="button"
              >
                View
              </button>
            </div>
          ))}
          {renderTimelinePagination()}
        </>
      )}
    </div>
  );



  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'timeline': return renderTimeline();
      default: return renderOverview();
    }
  };

  return (
    <>
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="split-patients__detail-header">
        <div className="split-patients__detail-hero">
          <div className="split-patients__detail-avatar">
            {data.avatarUrl ? (
              <img alt="" src={data.avatarUrl} />
            ) : (
              <span>{(data.fullName || 'P').charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="split-patients__detail-hero-info">
            <h2>{data.fullName}</h2>
            <p>{data.email || data.phoneNumber || 'No contact listed'}</p>
          </div>
        </div>

      </div>

      <div className="split-patients__tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`split-patients__tab${activeTab === tab.key ? ' split-patients__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="split-patients__tab-content">
        {renderTabContent()}
      </div>
    </div>
    </>
  );
}
