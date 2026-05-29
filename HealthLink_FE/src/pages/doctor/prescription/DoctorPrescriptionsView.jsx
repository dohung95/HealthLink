import React, { useEffect, useMemo, useState } from 'react';
import { prescriptionService } from '@api/prescriptionApi';
import '@components/Css/doctor/doctor-dashboard/foundation.css';
import '@components/Css/doctor/doctor-dashboard/shared-ui.css';
import '@components/Css/doctor/doctor-dashboard/layout.css';
import '@components/Css/doctor/doctor-dashboard/prescriptions.css';
import '@components/Css/doctor/doctor-dashboard/responsive.css';

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

const getInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const getStatusBadgeClass = (status) => {
  if (status === 'Active') return 'doctor-prescription-item__status-badge--active';
  if (status === 'Expired') return 'doctor-prescription-item__status-badge--expired';
  return 'doctor-prescription-item__status-badge--default';
};


const avatarColors = [
  '#0052cc', '#10b981', '#d97706', '#dc2626',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
];

const getAvatarColor = (name) => {
  if (!name) return avatarColors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

export default function DoctorPrescriptionsView({ doctorId, onOpenAppointmentById }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!doctorId) return;
    let mounted = true;

    const loadPrescriptions = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await prescriptionService.getDoctorPrescriptions(doctorId);
        if (mounted) setPrescriptions(data);
      } catch (err) {
        console.error('Error loading prescriptions:', err);
        if (mounted) {
          setError('Failed to load prescriptions');
          setPrescriptions([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadPrescriptions();
    return () => {
      mounted = false;
    };
  }, [doctorId]);

  const statuses = useMemo(() => {
    const values = new Set(prescriptions.map((item) => item.status).filter(Boolean));
    return ['all', ...values];
  }, [prescriptions]);

  const statusCounts = useMemo(() => {
    const counts = { all: prescriptions.length };
    prescriptions.forEach((p) => {
      const s = p.status || 'Issued';
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [prescriptions]);

  const filteredPrescriptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return prescriptions.filter((prescription) => {
      if (status !== 'all' && prescription.status !== status) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      return [
        prescription.patientName,
        prescription.diagnosis,
        prescription.notes,
        ...(prescription.medications || []).map((item) => item.medicationName),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [prescriptions, query, status]);

  const sortedPrescriptions = useMemo(() => {
    return [...filteredPrescriptions].sort((a, b) => {
      const dateA = a.issueDate ? new Date(a.issueDate).getTime() : 0;
      const dateB = b.issueDate ? new Date(b.issueDate).getTime() : 0;
      return dateB - dateA;
    });
  }, [filteredPrescriptions]);

  return (
    <div className="doctor-content-section px-3 px-xl-4 py-3 py-md-4">
      {/* ==================== TOOLBAR ==================== */}
      <div className="doctor-prescription-toolbar d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4 pb-3"
        style={{
          background: 'linear-gradient(135deg, var(--surface) 0%, var(--primary-subtle) 100%)',
          boxShadow: '0 8px 32px rgba(0, 82, 204, 0.06), 0 2px 8px rgba(0, 0, 0, 0.03)',
        }}>

        {/* Left: Search */}
        <div className="doctor-prescription-search-wrap flex-grow-1">
          <div className="doctor-prescription-search"
            style={{
              background: query ? 'var(--surface)' : 'rgba(255,255,255,0.85)',
              border: query ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
              boxShadow: query ? '0 0 0 4px var(--focus-ring), 0 2px 8px rgba(0,82,204,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <span className="doctor-prescription-search__icon material-symbols-outlined">search</span>
            <input
              aria-label="Search prescriptions"
              className="doctor-prescription-search__input"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search patient, diagnosis..."
              value={query}
            />
            {query ? (
              <button
                className="doctor-prescription-search__clear"
                onClick={() => setQuery('')}
                type="button"
                aria-label="Clear search"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            ) : (
              <span className="doctor-prescription-search__hint">
                <kbd>/</kbd>
              </span>
            )}
          </div>
        </div>

        {/* Right: Status filter chips */}
        <div className="doctor-prescription-filters flex-shrink-0">
          {statuses.map((value) => (
            <button
              key={value}
              className={`doctor-prescription-filter-chip ${status === value ? 'doctor-prescription-filter-chip--active' : ''}`}
              onClick={() => setStatus(value)}
              type="button"
            >
              {value === 'all' ? 'All' : value}
              <span className="doctor-prescription-filter-chip__count">{statusCounts[value] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ==================== CONTENT ==================== */}
      {loading ? (
        <div className="prescription-state">
          <div className="spinner-border mb-3" role="status" style={{ width: '2.25rem', height: '2.25rem', color: 'var(--primary)' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <h3 className="prescription-state__title">Loading prescriptions</h3>
          <p className="prescription-state__desc">Fetching prescription data...</p>
        </div>
      ) : error ? (
        <div className="prescription-state">
          <div className="prescription-state__icon-wrapper" style={{ background: 'rgba(220, 38, 38, 0.1)', color: 'var(--error)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>error</span>
          </div>
          <h3 className="prescription-state__title" style={{ color: 'var(--error)' }}>{error}</h3>
          <p className="prescription-state__desc">Please try again or contact support.</p>
        </div>
      ) : sortedPrescriptions.length === 0 ? (
        <div className="d-flex flex-column align-items-center justify-content-center text-center py-5 rounded-4"
          style={{ background: 'var(--surface)', border: '1px dashed var(--border)', minHeight: '300px' }}>
          <div className="d-flex align-items-center justify-content-center rounded-circle mb-3"
            style={{ width: '3.5rem', height: '3.5rem', background: 'var(--surface-muted)', color: 'var(--text-muted)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>medication</span>
          </div>
          <h3 className="fs-6 fw-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            {query || status !== 'all' ? 'No matching prescriptions' : 'No prescriptions found'}
          </h3>
          <p className="small mb-0" style={{ color: 'var(--text-muted)', maxWidth: '280px' }}>
            {query || status !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'Issued prescriptions will appear here.'}
          </p>
        </div>
      ) : (
        <div className="row g-3 align-items-stretch">
          {/* ==================== LIST COLUMN ==================== */}
          <div className="col-lg-5 d-flex flex-column">
            <div className="doctor-prescription-list flex-grow-1">
            {sortedPrescriptions.map((prescription) => {
              const isSelected = selected?.prescriptionHeaderId === prescription.prescriptionHeaderId;
              const avatarColor = getAvatarColor(prescription.patientName);
              return (
                <article
                  key={prescription.prescriptionHeaderId}
                  className={`doctor-prescription-item ${isSelected ? 'doctor-prescription-item--selected' : ''}`}
                  onClick={() => setSelected(prescription)}
                >
                  <div
                    className="doctor-prescription-item__avatar"
                    style={{ background: avatarColor }}
                  >
                    {getInitials(prescription.patientName)}
                  </div>
                  <div className="doctor-prescription-item__body">
                    <p className="doctor-prescription-item__name">
                      {prescription.patientName || 'Unknown Patient'}
                    </p>
                    <p className="doctor-prescription-item__date">
                      {formatDateTime(prescription.issueDate)}
                    </p>
                    <div className="doctor-prescription-item__footer">
                      {prescription.diagnosis && (
                        <p className="doctor-prescription-item__diagnosis">
                          {prescription.diagnosis}
                        </p>
                      )}
                      <span
                        className={`doctor-prescription-item__status-badge ${getStatusBadgeClass(prescription.status)}`}
                      >
                        {prescription.status || 'Issued'}
                      </span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined doctor-prescription-item__chevron">
                    chevron_right
                  </span>
                </article>
              );
            })}
            </div>
          </div>

          {/* ==================== DETAIL COLUMN ==================== */}
          <aside className="col-lg-7 d-flex">
            {selected ? (
              <div className="doctor-prescription-detail">
                {/* Sticky Header */}
                <div className="doctor-prescription-detail__sticky-header">
                  <div className="doctor-prescription-detail__patient-group">
                    <p className="doctor-prescription-detail__label">Prescription</p>
                    <h4 className="doctor-prescription-detail__patient-name">
                      <span className="material-symbols-outlined me-1 align-middle" style={{ fontSize: '1.125rem', color: 'var(--primary)' }}>person</span>
                      {selected.patientName || 'Unknown Patient'}
                    </h4>
                  </div>
                  {(selected.appointmentId || selected.consultationId) && (
                    <button
                      className="btn btn-sm d-inline-flex align-items-center gap-1"
                      onClick={() => onOpenAppointmentById?.(selected.appointmentId || selected.consultationId)}
                      type="button"
                      style={{
                        borderRadius: '999px',
                        padding: '0.4rem 1rem',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        background: 'var(--primary)',
                        border: 'none',
                        color: '#fff',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--primary-hover)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,82,204,0.3)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>open_in_new</span>
                      Consultation Detail
                    </button>
                  )}
                </div>

                {/* Body */}
                <div className="doctor-prescription-detail__body">
                  {/* Info Grid */}
                  <div className="doctor-prescription-detail__info-grid">
                    <div className="doctor-prescription-detail__info-item">
                      <p className="doctor-prescription-detail__info-label">
                        <span className="material-symbols-outlined me-1 align-middle" style={{ fontSize: '0.75rem' }}>calendar_today</span>
                        Issue Date
                      </p>
                      <p className="doctor-prescription-detail__info-value">
                        {formatDateTime(selected.issueDate)}
                      </p>
                    </div>
                    {selected.diagnosis ? (
                      <div className="doctor-prescription-detail__info-item">
                        <p className="doctor-prescription-detail__info-label">
                          <span className="material-symbols-outlined me-1 align-middle" style={{ fontSize: '0.75rem' }}>biotech</span>
                          Diagnosis
                        </p>
                        <p className="doctor-prescription-detail__info-value">
                          {selected.diagnosis}
                        </p>
                      </div>
                    ) : (
                      <div className="doctor-prescription-detail__info-item">
                        <p className="doctor-prescription-detail__info-label">
                          <span className="material-symbols-outlined me-1 align-middle" style={{ fontSize: '0.75rem' }}>info</span>
                          Status
                        </p>
                        <p className="doctor-prescription-detail__info-value">
                          {selected.status || 'Issued'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Doctor Notes */}
                  {selected.notes && (
                    <div className="doctor-prescription-detail__notes">
                      <p className="doctor-prescription-detail__notes-label">
                        <span className="material-symbols-outlined me-1 align-middle" style={{ fontSize: '0.75rem' }}>description</span>
                        Doctor Notes
                      </p>
                      <p className="doctor-prescription-detail__notes-text">{selected.notes}</p>
                    </div>
                  )}

                  {/* Medications */}
                  <div className="doctor-prescription-detail__meds-section">
                    <div className="doctor-prescription-detail__meds-header">
                      <p className="doctor-prescription-detail__meds-title">
                        <span className="material-symbols-outlined">
                          medication
                        </span>
                        Medications
                      </p>
                      <span className="doctor-prescription-detail__meds-count">
                        {(selected.medications || selected.items || []).length}
                      </span>
                    </div>

                    {(selected.medications || selected.items || []).map((item, index) => (
                      <article
                        className="doctor-prescription-detail__med-item"
                        key={`${item.medicationName || 'medicine'}-${index}`}
                      >
                        <div className="doctor-prescription-detail__med-top">
                          <p className="doctor-prescription-detail__med-name">
                            {item.medicationName || `Medication ${index + 1}`}
                          </p>
                          {item.quantity && (
                            <span className="doctor-prescription-detail__med-quantity">
                              Qty: {item.quantity}
                            </span>
                          )}
                        </div>
                        <div className="doctor-prescription-detail__med-details">
                          {item.dosage && (
                            <span className="doctor-prescription-detail__med-detail-chip">
                              <span className="material-symbols-outlined">speed</span>
                              {item.dosage}
                            </span>
                          )}
                          {item.frequency && (
                            <span className="doctor-prescription-detail__med-detail-chip">
                              <span className="material-symbols-outlined">schedule</span>
                              {item.frequency}
                            </span>
                          )}
                          {item.route && (
                            <span className="doctor-prescription-detail__med-detail-chip">
                              <span className="material-symbols-outlined">hdr_weak</span>
                              {item.route}
                            </span>
                          )}
                          {item.duration && (
                            <span className="doctor-prescription-detail__med-detail-chip">
                              <span className="material-symbols-outlined">date_range</span>
                              {item.duration}
                            </span>
                          )}
                        </div>
                        {item.notes && (
                          <p className="doctor-prescription-detail__med-notes">
                            {item.notes}
                          </p>
                        )}
                      </article>
                    ))}

                    {(!selected.medications || selected.medications.length === 0) &&
                      (!selected.items || selected.items.length === 0) && (
                      <div className="text-center py-4 rounded-3" style={{ background: 'var(--surface-muted)', border: '1px dashed var(--border)' }}>
                        <span className="material-symbols-outlined d-block mb-2" style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>medication</span>
                        <p className="mb-0" style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                          No medication details available
                        </p>
                      </div>
                    )}
                  </div>
                </div>


              </div>
            ) : (
              <div className="doctor-prescription-detail d-flex align-items-center justify-content-center">
                <div className="text-center py-5 px-3">
                  <div className="d-flex align-items-center justify-content-center rounded-circle mx-auto mb-3"
                    style={{ width: '4rem', height: '4rem', background: 'var(--primary-subtle)', color: 'var(--primary)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1.75rem' }}>file_present</span>
                  </div>
                  <h3 className="fs-6 fw-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                    Select a prescription
                  </h3>
                  <p className="small mb-0 mx-auto" style={{ color: 'var(--text-muted)', maxWidth: '260px', lineHeight: '1.5' }}>
                    Choose an issued prescription from the list to view full details, medications, and actions.
                  </p>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
