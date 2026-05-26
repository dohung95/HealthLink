import React, { useEffect, useMemo, useState } from 'react';
import { prescriptionService } from '../../../api/prescriptionApi';
import '../Css/DoctorDashboard.css';

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

const getDetailStatusClass = (status) => {
  if (status === 'Active') return 'doctor-prescription-detail__status-badge--active';
  if (status === 'Expired') return 'doctor-prescription-detail__status-badge--expired';
  return 'doctor-prescription-detail__status-badge--default';
};

const avatarColors = [
  '#137fec', '#10b981', '#f59e0b', '#ef4444',
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
    <div className="doctor-content-section">
      {/* Page Header */}
      <div className="doctor-page-header mb-3">
        <h1 className="doctor-page-header__title">Prescriptions</h1>
        <p className="doctor-page-header__subtitle">
          Prescription archive &middot; {prescriptions.length} total
          {query && ` &middot; ${sortedPrescriptions.length} matching`}
        </p>
      </div>

      {/* Toolbar */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-3">
        <div className="d-flex align-items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="doctor-prescription-search">
            <span className="material-symbols-outlined doctor-prescription-search__icon">search</span>
            <input
              aria-label="Search prescriptions"
              className="doctor-prescription-search__input"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search patient, diagnosis..."
              value={query}
            />
            {query && (
              <button
                className="doctor-prescription-search__clear"
                onClick={() => setQuery('')}
                type="button"
                aria-label="Clear search"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            )}
          </div>

          {/* Status filter chips */}
          <div className="doctor-prescription-filters">
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
      </div>

      {loading ? (
        <div className="doctor-empty-state">
          <div className="spinner-border text-primary" role="status" style={{ width: '2rem', height: '2rem' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <h3 className="doctor-empty-state__title mt-3">Loading prescriptions</h3>
          <p className="doctor-empty-state__desc">Fetching prescription data...</p>
        </div>
      ) : error ? (
        <div className="doctor-schedule-state doctor-schedule-state--error">
          <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: 'var(--error)' }}>error</span>
          <h3 className="doctor-schedule-state__error-title">{error}</h3>
          <p className="doctor-schedule-state__error-desc">Please try again or contact support.</p>
        </div>
      ) : sortedPrescriptions.length === 0 ? (
        <div className="doctor-empty-state" style={{ minHeight: '300px' }}>
          <div className="doctor-empty-state__icon">
            <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>medication</span>
          </div>
          <h3 className="doctor-empty-state__title">
            {query || status !== 'all' ? 'No matching prescriptions' : 'No prescriptions found'}
          </h3>
          <p className="doctor-empty-state__desc">
            {query || status !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'Issued prescriptions will appear here.'}
          </p>
        </div>
      ) : (
        <div className="row g-3">
          {/* List column */}
          <div className="col-lg-5 doctor-prescription-list">
            {sortedPrescriptions.map((prescription) => {
              const isSelected = selected?.prescriptionHeaderId === prescription.prescriptionHeaderId;
              return (
                <article
                  key={prescription.prescriptionHeaderId}
                  className={`doctor-prescription-item ${isSelected ? 'doctor-prescription-item--selected' : ''}`}
                  onClick={() => setSelected(prescription)}
                >
                  <div
                    className="doctor-prescription-item__avatar"
                    style={{ background: getAvatarColor(prescription.patientName) }}
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

          {/* Detail column */}
          <aside className="col-lg-7">
            {selected ? (
              <div className="doctor-prescription-detail">
                {/* Sticky Header */}
                <div className="doctor-prescription-detail__sticky-header">
                  <div className="doctor-prescription-detail__patient-group">
                    <p className="doctor-prescription-detail__label">Prescription</p>
                    <h4 className="doctor-prescription-detail__patient-name">
                      {selected.patientName || 'Unknown Patient'}
                    </h4>
                  </div>
                  <span
                    className={`doctor-prescription-detail__status-badge ${getDetailStatusClass(selected.status)}`}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>
                      {selected.status === 'Active' ? 'check_circle' : 'info'}
                    </span>
                    {selected.status || 'Issued'}
                  </span>
                </div>

                {/* Body */}
                <div className="doctor-prescription-detail__body">
                  {/* Info Grid */}
                  <div className="doctor-prescription-detail__info-grid">
                    <div className="doctor-prescription-detail__info-item">
                      <p className="doctor-prescription-detail__info-label">Issue Date</p>
                      <p className="doctor-prescription-detail__info-value">
                        {formatDateTime(selected.issueDate)}
                      </p>
                    </div>
                    {selected.diagnosis && (
                      <div className="doctor-prescription-detail__info-item">
                        <p className="doctor-prescription-detail__info-label">Diagnosis</p>
                        <p className="doctor-prescription-detail__info-value">
                          {selected.diagnosis}
                        </p>
                      </div>
                    )}
                    {!selected.diagnosis && (
                      <div className="doctor-prescription-detail__info-item">
                        <p className="doctor-prescription-detail__info-label">Status</p>
                        <p className="doctor-prescription-detail__info-value">
                          {selected.status || 'Issued'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Doctor Notes */}
                  {selected.notes && (
                    <div className="doctor-prescription-detail__notes">
                      <p className="doctor-prescription-detail__notes-label">Doctor Notes</p>
                      <p className="doctor-prescription-detail__notes-text">{selected.notes}</p>
                    </div>
                  )}

                  {/* Medications */}
                  <div className="doctor-prescription-detail__meds-section">
                    <div className="doctor-prescription-detail__meds-header">
                      <p className="doctor-prescription-detail__meds-title">
                        <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--primary)' }}>
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
                      <div className="text-center py-3">
                        <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>medication</span>
                        <p className="mt-1 mb-0" style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                          No medication details available
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action bar */}
                {selected.appointmentId && (
                  <div className="doctor-prescription-detail__action-bar">
                    <button
                      className="btn btn-primary w-100"
                      onClick={() => onOpenAppointmentById?.(selected.appointmentId)}
                      type="button"
                    >
                      <span className="material-symbols-outlined me-1" style={{ fontSize: '1rem' }}>open_in_new</span>
                      Open Linked Appointment
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="doctor-prescription-detail">
                <div
                  className="doctor-empty-state"
                  style={{
                    minHeight: '460px',
                    border: 'none',
                    borderRadius: '0',
                  }}
                >
                  <div className="doctor-empty-state__icon">
                    <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>file_present</span>
                  </div>
                  <h3 className="doctor-empty-state__title">Select a prescription</h3>
                  <p className="doctor-empty-state__desc">
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
