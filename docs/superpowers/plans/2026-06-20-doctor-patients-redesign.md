# Doctor Patients Pages — Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace current separate patients list + detail pages with a single split-view page (list panel left, detail panel right).

**Architecture:** A single `DoctorPatientsView` container component manages all state (list, search, filter, selection, detail). Child presentational components handle the list rows and detail tabs. Routing uses React Router params for deep linking.

**Tech Stack:** React 19, Vite 7, Bootstrap 5, Tailwind v4, CSS custom properties (Geist font, Material Symbols), CSS modules.

**Files at a glance:**

| File | Action | Purpose |
|------|--------|---------|
| `src/pages/doctor/patient/DoctorPatientsView.jsx` | Rewrite | Split-view container |
| `src/pages/doctor/patient/DoctorPatientDetailView.jsx` | Refactor | Tabs-based detail panel |
| `src/components/doctor/PatientCompactRow.jsx` | Create | Compact row for list panel |
| `src/components/Css/doctor/doctor-dashboard/doctor-split-patients.css` | Create | Split-view styles |
| `src/components/Css/doctor/doctor-dashboard/doctor-dashboard.css` | Modify | Add CSS import |
| `src/pages/doctor/DoctorDashboardPage.jsx` | Modify | Update routes |

---

### Task 1: Create CSS file for split-view layout

**Files:**
- Create: `src/components/Css/doctor/doctor-dashboard/doctor-split-patients.css`

- [ ] **Step 1: Write the CSS file**

```css
/* ============================================
   SPLIT-VIEW PATIENTS
   ============================================ */

/* Container */
.split-patients-container {
  display: flex;
  gap: 0;
  height: calc(100dvh - var(--doctor-header-height, 4rem) - 0.5rem);
  overflow: hidden;
}

/* Left panel */
.split-patients-list {
  width: 35%;
  min-width: 280px;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--doctor-border);
  background: var(--doctor-surface);
}

/* Right panel */
.split-patients-detail {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  background: var(--doctor-bg);
}

/* List: toolbar */
.split-patients__toolbar {
  padding: 1rem 1rem 0.75rem;
  border-bottom: 1px solid var(--doctor-border-light);
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  flex-shrink: 0;
}

.split-patients__search {
  position: relative;
}

.split-patients__search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--doctor-text-muted);
  font-size: 1.125rem;
  pointer-events: none;
}

.split-patients__search-input {
  width: 100%;
  padding: 0.5rem 0.75rem 0.5rem 2.5rem;
  border: 1px solid var(--doctor-border);
  border-radius: var(--doctor-radius-md);
  font-size: 0.8125rem;
  font-family: inherit;
  color: var(--doctor-text);
  background: var(--doctor-surface-muted);
  outline: none;
  transition: var(--doctor-transition);
}

.split-patients__search-input:focus {
  border-color: var(--doctor-primary);
  box-shadow: 0 0 0 3px var(--doctor-focus-ring);
  background: var(--doctor-surface);
}

.split-patients__search-input::placeholder {
  color: var(--doctor-text-muted);
}

/* List: filter chips */
.split-patients__filters {
  display: flex;
  gap: 0.25rem;
}

.split-patients__filter-chip {
  padding: 0.25rem 0.625rem;
  border-radius: 999px;
  border: 1px solid var(--doctor-border);
  background: transparent;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--doctor-text-secondary);
  cursor: pointer;
  transition: var(--doctor-transition);
  font-family: inherit;
  line-height: 1.4;
}

.split-patients__filter-chip:hover {
  border-color: var(--doctor-primary);
  color: var(--doctor-primary);
}

.split-patients__filter-chip--active {
  background: var(--doctor-primary);
  border-color: var(--doctor-primary);
  color: #ffffff;
}

/* List: scrollable area */
.split-patients__list-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0.375rem 0;
}

/* Patient compact row */
.patient-compact-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6875rem 1rem;
  cursor: pointer;
  transition: background 0.15s ease;
  position: relative;
  border-left: 3px solid transparent;
}

.patient-compact-row:hover {
  background: var(--doctor-surface-muted);
}

.patient-compact-row--active {
  background: var(--doctor-primary-subtle);
  border-left-color: var(--doctor-primary);
}

.patient-compact-row--active:hover {
  background: var(--doctor-primary-soft);
}

.patient-compact-row__avatar {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--doctor-primary-soft), var(--doctor-primary-border));
  color: var(--doctor-primary);
  font-weight: 800;
  font-size: 0.75rem;
  flex-shrink: 0;
  overflow: hidden;
}

.patient-compact-row__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.patient-compact-row__info {
  flex: 1;
  min-width: 0;
}

.patient-compact-row__name {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--doctor-text);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.patient-compact-row__phone {
  font-size: 0.7rem;
  color: var(--doctor-text-muted);
  margin: 0.1rem 0 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.patient-compact-row__phone .material-symbols-outlined {
  font-size: 0.75rem;
}

.patient-compact-row__status {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 999px;
  flex-shrink: 0;
}

.patient-compact-row__status--upcoming {
  background: var(--doctor-primary);
  box-shadow: 0 0 0 2px rgba(0, 82, 204, 0.2);
}

.patient-compact-row__status--recent {
  background: var(--doctor-warning);
  box-shadow: 0 0 0 2px rgba(217, 119, 6, 0.2);
}

.patient-compact-row__status--inactive {
  background: var(--doctor-text-muted);
  box-shadow: 0 0 0 2px rgba(100, 116, 139, 0.15);
}

/* List: pagination */
.split-patients__pagination {
  padding: 0.625rem 1rem;
  border-top: 1px solid var(--doctor-border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  font-size: 0.75rem;
}

.split-patients__pagination-info {
  color: var(--doctor-text-muted);
  font-weight: 500;
}

.split-patients__pagination-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.3rem 0.625rem;
  border: 1px solid var(--doctor-border);
  border-radius: var(--doctor-radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--doctor-text-secondary);
  background: var(--doctor-surface);
  cursor: pointer;
  transition: var(--doctor-transition);
  font-family: inherit;
}

.split-patients__pagination-btn:hover:not(:disabled) {
  border-color: var(--doctor-primary);
  color: var(--doctor-primary);
}

.split-patients__pagination-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.split-patients__pagination-nav {
  display: flex;
  gap: 0.25rem;
}

/* Detail panel: empty state */
.split-patients__empty-detail {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 0.75rem;
  color: var(--doctor-text-muted);
  padding: 2rem;
}

.split-patients__empty-detail .material-symbols-outlined {
  font-size: 3rem;
  color: var(--doctor-border);
}

.split-patients__empty-detail h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--doctor-text-secondary);
  margin: 0;
}

.split-patients__empty-detail p {
  font-size: 0.8125rem;
  margin: 0;
  text-align: center;
}

/* Detail panel: back button (mobile) */
.split-patients__mobile-back {
  display: none;
}

/* Detail header */
.split-patients__detail-header {
  padding: 1.25rem 1.5rem 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.split-patients__detail-hero {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.split-patients__detail-avatar {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 0.875rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--doctor-primary-soft), var(--doctor-primary-border));
  color: var(--doctor-primary);
  font-weight: 800;
  font-size: 1rem;
  flex-shrink: 0;
  overflow: hidden;
}

.split-patients__detail-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.split-patients__detail-hero-info {
  flex: 1;
  min-width: 0;
}

.split-patients__detail-hero-info h2 {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--doctor-text);
  margin: 0;
  line-height: 1.3;
}

.split-patients__detail-hero-info p {
  font-size: 0.8rem;
  color: var(--doctor-text-muted);
  margin: 0.1rem 0 0;
}

.split-patients__detail-actions {
  display: flex;
  gap: 0.375rem;
  flex-shrink: 0;
}

.split-patients__detail-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid var(--doctor-border);
  border-radius: var(--doctor-radius-md);
  background: var(--doctor-surface);
  color: var(--doctor-text-secondary);
  cursor: pointer;
  transition: var(--doctor-transition);
  font-size: 1.125rem;
}

.split-patients__detail-action-btn:hover {
  border-color: var(--doctor-primary);
  color: var(--doctor-primary);
  background: var(--doctor-primary-subtle);
}

/* Quick stats */
.split-patients__quick-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1rem;
  padding: 0.75rem 1rem;
  background: var(--doctor-surface);
  border: 1px solid var(--doctor-border-light);
  border-radius: var(--doctor-radius-md);
  font-size: 0.75rem;
}

.split-patients__quick-stat {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.split-patients__quick-stat-label {
  color: var(--doctor-text-muted);
  font-weight: 500;
}

.split-patients__quick-stat-value {
  color: var(--doctor-text);
  font-weight: 700;
}

.split-patients__quick-stat-divider {
  width: 1px;
  height: 1rem;
  background: var(--doctor-border);
}

/* Tab navigation */
.split-patients__tabs {
  display: flex;
  border-bottom: 1px solid var(--doctor-border);
  padding: 0 1.5rem;
  gap: 0;
  flex-shrink: 0;
  background: var(--doctor-surface);
}

.split-patients__tab {
  padding: 0.625rem 1rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--doctor-text-muted);
  border: none;
  background: none;
  cursor: pointer;
  font-family: inherit;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: var(--doctor-transition);
  white-space: nowrap;
}

.split-patients__tab:hover {
  color: var(--doctor-text-secondary);
}

.split-patients__tab--active {
  color: var(--doctor-primary);
  border-bottom-color: var(--doctor-primary);
}

/* Tab content */
.split-patients__tab-content {
  padding: 1.25rem 1.5rem;
  overflow-y: auto;
  flex: 1;
}

/* Info field */
.patient-info-field {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.75rem 1rem;
  background: var(--doctor-surface);
  border: 1px solid var(--doctor-border-light);
  border-radius: var(--doctor-radius-md);
}

.patient-info-field__label {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--doctor-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.patient-info-field__value {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--doctor-text);
}

/* Timeline item (appointments, prescriptions) */
.patient-timeline-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.875rem 1rem;
  background: var(--doctor-surface);
  border: 1px solid var(--doctor-border-light);
  border-radius: var(--doctor-radius-md);
  transition: var(--doctor-transition);
}

.patient-timeline-item:hover {
  border-color: var(--doctor-border);
  box-shadow: var(--doctor-shadow-sm);
}

.patient-timeline-item__info {
  min-width: 0;
  flex: 1;
}

.patient-timeline-item__title {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--doctor-text);
  margin: 0;
}

.patient-timeline-item__subtitle {
  font-size: 0.75rem;
  color: var(--doctor-text-muted);
  margin: 0.15rem 0 0;
}

.patient-timeline-item__diagnosis {
  font-size: 0.75rem;
  color: var(--doctor-text-secondary);
  margin: 0.25rem 0 0;
}

.patient-timeline-item__action {
  padding: 0.3rem 0.75rem;
  border: 1px solid var(--doctor-border);
  border-radius: var(--doctor-radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--doctor-text-secondary);
  background: var(--doctor-surface);
  cursor: pointer;
  transition: var(--doctor-transition);
  font-family: inherit;
  white-space: nowrap;
  flex-shrink: 0;
}

.patient-timeline-item__action:hover {
  border-color: var(--doctor-primary);
  color: var(--doctor-primary);
}

/* Section title */
.patient-section-title {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--doctor-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin: 0 0 0.75rem;
}

/* Loading skeleton for list rows */
@keyframes rowShimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.patient-row-skeleton {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
}

.patient-row-skeleton__avatar {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.5rem;
  background: linear-gradient(90deg, var(--doctor-surface-muted) 25%, var(--doctor-border-light) 50%, var(--doctor-surface-muted) 75%);
  background-size: 200% 100%;
  animation: rowShimmer 1.5s ease-in-out infinite;
  flex-shrink: 0;
}

.patient-row-skeleton__lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.patient-row-skeleton__line {
  height: 0.75rem;
  border-radius: 0.25rem;
  background: linear-gradient(90deg, var(--doctor-surface-muted) 25%, var(--doctor-border-light) 50%, var(--doctor-surface-muted) 75%);
  background-size: 200% 100%;
  animation: rowShimmer 1.5s ease-in-out infinite;
}

/* Responsive: collapse to single column */
@media (max-width: 899px) {
  .split-patients-container {
    flex-direction: column;
    height: auto;
    min-height: calc(100dvh - var(--doctor-header-height, 4rem));
  }

  .split-patients-list {
    width: 100%;
    min-width: 0;
    max-width: none;
    border-right: none;
  }

  .split-patients-detail {
    display: none;
  }

  .split-patients-detail--visible {
    display: block;
    position: fixed;
    inset: 0;
    top: var(--doctor-header-height, 4rem);
    z-index: 20;
    overflow-y: auto;
  }

  .split-patients__mobile-back {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.625rem 1.25rem 0;
    border: none;
    background: none;
    color: var(--doctor-text-secondary);
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
  }

  .split-patients__mobile-back:hover {
    color: var(--doctor-primary);
  }

  .split-patients-list--hidden {
    display: none;
  }
}
```

### Task 2: Create PatientCompactRow component

**Files:**
- Create: `src/components/doctor/PatientCompactRow.jsx`

- [ ] **Step 1: Write the component**

```jsx
import React from 'react';

const getStatusInfo = (patient) => {
  if (patient.nextAppointmentTime) return { key: 'upcoming', label: 'Upcoming' };
  if (patient.lastAppointmentTime) return { key: 'recent', label: 'Recent' };
  return { key: 'inactive', label: 'Inactive' };
};

const PatientCompactRow = ({ patient, isActive, onSelect }) => {
  const status = getStatusInfo(patient);

  return (
    <div
      className={`patient-compact-row${isActive ? ' patient-compact-row--active' : ''}`}
      onClick={() => onSelect(patient.patientId)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(patient.patientId); }}
    >
      <div className="patient-compact-row__avatar">
        {patient.avatarUrl ? (
          <img alt="" src={patient.avatarUrl} />
        ) : (
          <span>{(patient.fullName || 'P').charAt(0).toUpperCase()}</span>
        )}
      </div>
      <div className="patient-compact-row__info">
        <p className="patient-compact-row__name">{patient.fullName}</p>
        <p className="patient-compact-row__phone">
          <span className="material-symbols-outlined">call</span>
          {patient.phoneNumber || '—'}
        </p>
      </div>
      <div className={`patient-compact-row__status patient-compact-row__status--${status.key}`} title={status.label} />
    </div>
  );
};

export default PatientCompactRow;
```

### Task 3: Refactor DoctorPatientDetailView (tabs-based)

**Files:**
- Modify: `src/pages/doctor/patient/DoctorPatientDetailView.jsx`

- [ ] **Step 1: Rewrite with tabs and accept history as prop**

```jsx
import React, { useState } from 'react';

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
  { key: 'medical', label: 'Medical' },
  { key: 'appointments', label: 'Appointments' },
  { key: 'prescriptions', label: 'Prescriptions' },
  { key: 'documents', label: 'Documents' },
];

const InfoField = ({ label, value }) => (
  <div className="patient-info-field">
    <span className="patient-info-field__label">{label}</span>
    <strong className="patient-info-field__value">{value || 'N/A'}</strong>
  </div>
);

export default function DoctorPatientDetailView({ patient, history, onOpenAppointmentById }) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!patient) return null;

  const completedAppointments = (history?.appointments || [])
    .filter((a) => String(a.status || '').toLowerCase() === 'completed');

  const data = history || patient;

  const renderOverview = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <p className="patient-section-title">Patient Information</p>
      <div className="row g-2">
        <div className="col-6 col-md-4"><InfoField label="Phone" value={data.phoneNumber} /></div>
        <div className="col-6 col-md-4"><InfoField label="Gender" value={data.gender} /></div>
        <div className="col-6 col-md-4"><InfoField label="Blood Type" value={data.bloodType} /></div>
        <div className="col-6 col-md-4"><InfoField label="DOB" value={data.dateOfBirth ? new Date(data.dateOfBirth).toLocaleDateString() : null} /></div>
        <div className="col-6 col-md-4"><InfoField label="Completed Visits" value={completedAppointments.length} /></div>
        <div className="col-6 col-md-4"><InfoField label="Prescriptions" value={history?.prescriptions?.length || 0} /></div>
      </div>
    </div>
  );

  const renderMedical = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <p className="patient-section-title">Medical Summary</p>
      <div className="row g-2">
        <div className="col-12 col-md-6"><InfoField label="History" value={data.medicalHistorySummary} /></div>
        <div className="col-12 col-md-6"><InfoField label="Allergies" value={data.allergies} /></div>
        <div className="col-12 col-md-6"><InfoField label="Chronic Conditions" value={data.chronicConditions} /></div>
        <div className="col-12 col-md-6"><InfoField label="Current Medications" value={data.currentMedications} /></div>
      </div>
    </div>
  );

  const renderAppointments = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
      <p className="patient-section-title">Appointment History</p>
      {history?.appointments?.length ? history.appointments.map((appt) => (
        <div className="patient-timeline-item" key={appt.appointmentId}>
          <div className="patient-timeline-item__info">
            <p className="patient-timeline-item__title">{formatDateTime(appt.appointmentTime)}</p>
            <p className="patient-timeline-item__subtitle">{appt.consultationType || 'Consultation'} — {appt.status}</p>
            {appt.diagnosis && <p className="patient-timeline-item__diagnosis">Diagnosis: {appt.diagnosis}</p>}
          </div>
          <button
            type="button"
            className="patient-timeline-item__action"
            onClick={() => onOpenAppointmentById?.(appt.appointmentId)}
          >
            Open
          </button>
        </div>
      )) : (
        <p style={{ fontSize: '0.8rem', color: 'var(--doctor-text-muted)' }}>No appointments found.</p>
      )}
    </div>
  );

  const renderPrescriptions = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
      <p className="patient-section-title">Prescriptions</p>
      {history?.prescriptions?.length ? history.prescriptions.map((rx) => (
        <div className="patient-timeline-item" key={rx.prescriptionHeaderId}>
          <div className="patient-timeline-item__info">
            <p className="patient-timeline-item__title">{formatDateTime(rx.issueDate)}</p>
            <p className="patient-timeline-item__subtitle">{rx.diagnosis || 'No diagnosis'} — {rx.status || 'Issued'}</p>
            <p className="patient-timeline-item__diagnosis">{rx.medications?.length || rx.items?.length || 0} medication(s)</p>
          </div>
          {rx.appointmentId && (
            <button
              type="button"
              className="patient-timeline-item__action"
              onClick={() => onOpenAppointmentById?.(rx.appointmentId)}
            >
              Appointment
            </button>
          )}
        </div>
      )) : (
        <p style={{ fontSize: '0.8rem', color: 'var(--doctor-text-muted)' }}>No prescriptions found.</p>
      )}
    </div>
  );

  const renderDocuments = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
      <p className="patient-section-title">Documents</p>
      {history?.documentsByCategory?.length ? history.documentsByCategory.map((cat) => (
        <div className="patient-timeline-item" key={cat.category}>
          <div className="patient-timeline-item__info">
            <p className="patient-timeline-item__title">{cat.category}</p>
            <p className="patient-timeline-item__subtitle">{cat.documentCount} document(s)</p>
          </div>
        </div>
      )) : (
        <p style={{ fontSize: '0.8rem', color: 'var(--doctor-text-muted)' }}>No documents found.</p>
      )}
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'medical': return renderMedical();
      case 'appointments': return renderAppointments();
      case 'prescriptions': return renderPrescriptions();
      case 'documents': return renderDocuments();
      default: return renderOverview();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Hero section */}
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
          <div className="split-patients__detail-actions">
            <button type="button" className="split-patients__detail-action-btn" title="Call" onClick={() => {}}>
              <span className="material-symbols-outlined">call</span>
            </button>
            <button type="button" className="split-patients__detail-action-btn" title="Message" onClick={() => {}}>
              <span className="material-symbols-outlined">chat</span>
            </button>
            <button type="button" className="split-patients__detail-action-btn" title="Schedule Appointment" onClick={() => {}}>
              <span className="material-symbols-outlined">calendar_add_on</span>
            </button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="split-patients__quick-stats">
          {data.gender && (
            <>
              <div className="split-patients__quick-stat">
                <span className="split-patients__quick-stat-label">Gender</span>
                <span className="split-patients__quick-stat-value">{data.gender}</span>
              </div>
              <div className="split-patients__quick-stat-divider" />
            </>
          )}
          {data.bloodType && (
            <>
              <div className="split-patients__quick-stat">
                <span className="split-patients__quick-stat-label">Blood</span>
                <span className="split-patients__quick-stat-value">{data.bloodType}</span>
              </div>
              <div className="split-patients__quick-stat-divider" />
            </>
          )}
          <div className="split-patients__quick-stat">
            <span className="split-patients__quick-stat-label">Visits</span>
            <span className="split-patients__quick-stat-value">{completedAppointments.length}</span>
          </div>
          <div className="split-patients__quick-stat-divider" />
          <div className="split-patients__quick-stat">
            <span className="split-patients__quick-stat-label">Prescriptions</span>
            <span className="split-patients__quick-stat-value">{history?.prescriptions?.length || 0}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
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

      {/* Tab content */}
      <div className="split-patients__tab-content">
        {renderTabContent()}
      </div>
    </div>
  );
}
```

### Task 4: Rewrite DoctorPatientsView as split-view container

**Files:**
- Modify: `src/pages/doctor/patient/DoctorPatientsView.jsx`

- [ ] **Step 1: Write the split-view container**

```jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doctorService } from '@api/doctorApi';
import PatientCompactRow from '@components/doctor/PatientCompactRow';
import DoctorPatientDetailView from '@pages/doctor/patient/DoctorPatientDetailView';
import DoctorEmptyState from '@components/doctor/DoctorEmptyState';
import DoctorErrorState from '@components/doctor/DoctorErrorState';
import '@components/Css/doctor/doctor-dashboard/doctor-split-patients.css';

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'recent', label: 'Recent' },
];

export default function DoctorPatientsView() {
  const navigate = useNavigate();
  const { patientId } = useParams();

  // List state
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, totalCount: 0 });
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState(null);

  // Detail state
  const [selectedPatientId, setSelectedPatientId] = useState(() => patientId || null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [history, setHistory] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  // Mobile state
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const searchTimer = useRef(null);

  // Sync selectedPatientId from URL param on mount or direct navigation
  useEffect(() => {
    if (patientId) {
      setSelectedPatientId(patientId);
    }
  }, [patientId]);

  // Debounced search + filter reset
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
    }, 250);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search, statusFilter]);

  // Fetch patients list
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setListLoading(true);
      setListError(null);
      try {
        const data = await doctorService.getMyDoctorPatients({
          search,
          status: statusFilter,
          page,
          pageSize: 12,
        });
        if (!mounted) return;
        setPatients(data.patients || []);
        setPagination({
          totalPages: data.totalPages || 1,
          totalCount: data.totalCount || 0,
        });
      } catch (err) {
        console.error('Failed to load patients:', err);
        if (!mounted) return;
        setListError('Failed to load patients');
        setPatients([]);
        setPagination({ totalPages: 1, totalCount: 0 });
      } finally {
        if (mounted) setListLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [page, search, statusFilter]);

  // Handle patient selection
  const handleSelectPatient = useCallback((id) => {
    setSelectedPatientId(id);
    navigate(`/doctor/patients/${id}`, { replace: true });
    setMobileDetailOpen(true);
  }, [navigate]);

  // Fetch patient detail + history when selectedPatientId changes
  useEffect(() => {
    if (!selectedPatientId) return;
    let mounted = true;
    const loadDetail = async () => {
      setDetailLoading(true);
      setDetailError(null);
      setSelectedPatient(null);
      setHistory(null);
      try {
        const [patientData, historyData] = await Promise.all([
          doctorService.getPatientById(selectedPatientId),
          doctorService.getMyDoctorPatientHistory(selectedPatientId),
        ]);
        if (!mounted) return;
        if (patientData) setSelectedPatient(patientData);
        if (historyData) setHistory(historyData);
      } catch (err) {
        console.error('Failed to load patient detail:', err);
        if (!mounted) return;
        setDetailError('Failed to load patient details');
      } finally {
        if (mounted) setDetailLoading(false);
      }
    };
    loadDetail();
    return () => { mounted = false; };
  }, [selectedPatientId]);

  // Handle back to list (mobile)
  const handleMobileBack = useCallback(() => {
    setMobileDetailOpen(false);
    navigate('/doctor/patients', { replace: true });
  }, [navigate]);

  // Cleanup selected state on unmount
  useEffect(() => {
    return () => {
      setSelectedPatient(null);
      setHistory(null);
    };
  }, []);

  const emptyMessage = useMemo(() => {
    if (search) return 'No patients matched this search.';
    if (statusFilter !== 'all') return `No ${statusFilter} patients found.`;
    return 'No patients have appointments with you yet.';
  }, [search, statusFilter]);

  const handleRetry = () => {
    setListError(null);
    setPage(1);
  };

  // Render list panel
  const renderList = () => (
    <div className={`split-patients-list${mobileDetailOpen ? ' split-patients-list--hidden' : ''}`}>
      <div className="split-patients__toolbar">
        <div className="split-patients__search">
          <span className="material-symbols-outlined split-patients__search-icon">search</span>
          <input
            aria-label="Search patients"
            className="split-patients__search-input"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone..."
            value={search}
          />
        </div>
        <div className="split-patients__filters">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              className={`split-patients__filter-chip${statusFilter === filter.key ? ' split-patients__filter-chip--active' : ''}`}
              onClick={() => setStatusFilter(filter.key)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="split-patients__list-scroll">
        {listLoading ? (
          Array.from({ length: 6 }, (_, i) => (
            <div className="patient-row-skeleton" key={i}>
              <div className="patient-row-skeleton__avatar" />
              <div className="patient-row-skeleton__lines">
                <div className="patient-row-skeleton__line" style={{ width: '60%' }} />
                <div className="patient-row-skeleton__line" style={{ width: '40%' }} />
              </div>
            </div>
          ))
        ) : listError ? (
          <DoctorErrorState message={listError} onRetry={handleRetry} />
        ) : patients.length === 0 ? (
          <DoctorEmptyState
            icon="groups"
            title="No patients found"
            description={emptyMessage}
          />
        ) : (
          patients.map((patient) => (
            <PatientCompactRow
              key={patient.patientId}
              patient={patient}
              isActive={String(selectedPatient?.patientId) === String(patient.patientId)}
              onSelect={handleSelectPatient}
            />
          ))
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="split-patients__pagination">
          <span className="split-patients__pagination-info">
            Page {page} of {pagination.totalPages}
          </span>
          <div className="split-patients__pagination-nav">
            <button
              type="button"
              className="split-patients__pagination-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '0.75rem' }}>chevron_left</span>
              Prev
            </button>
            <button
              type="button"
              className="split-patients__pagination-btn"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            >
              Next
              <span className="material-symbols-outlined" style={{ fontSize: '0.75rem' }}>chevron_right</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // Render detail panel
  const renderDetail = () => {
    if (!selectedPatient) {
      return (
        <div className="split-patients__empty-detail">
          <span className="material-symbols-outlined">group</span>
          <h3>Select a patient</h3>
          <p>Choose a patient from the list to view their details.</p>
        </div>
      );
    }

    if (detailLoading) {
      return (
        <div className="d-flex align-items-center justify-content-center" style={{ height: '100%' }}>
          <div className="spinner-border text-primary" role="status" style={{ width: '2rem', height: '2rem' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      );
    }

    if (detailError) {
      return (
        <div className="d-flex align-items-center justify-content-center" style={{ height: '100%', padding: '2rem' }}>
          <DoctorErrorState message={detailError} onRetry={() => handleSelectPatient(selectedPatient.patientId)} />
        </div>
      );
    }

    return (
      <>
        {/* Mobile back button */}
        <button
          type="button"
          className="split-patients__mobile-back"
          onClick={handleMobileBack}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>arrow_back</span>
          Back to patients
        </button>
        <DoctorPatientDetailView
          patient={selectedPatient}
          history={history}
          onOpenAppointmentById={(id) => navigate(`/doctor/appointments/${id}`)}
        />
      </>
    );
  };

  return (
    <div className="split-patients-container">
      {renderList()}
      <div className={`split-patients-detail${mobileDetailOpen ? ' split-patients-detail--visible' : ''}`}>
        {renderDetail()}
      </div>
    </div>
  );
}
```

### Task 5: Update routing in DoctorDashboardPage.jsx

**Files:**
- Modify: `src/pages/doctor/DoctorDashboardPage.jsx`

- [ ] **Step 1: Update both route paths to use the same component**

Find this block:
```jsx
<Route path="patients" element={<DoctorPatientsView />} />
<Route path="patients/:patientId" element={<DoctorPatientDetailRoute />} />
```

Replace with:
```jsx
<Route path="patients">
  <Route index element={<DoctorPatientsView />} />
  <Route path=":patientId" element={<DoctorPatientsView />} />
</Route>
```

Also remove the `DoctorPatientDetailRoute` function export if it's no longer used. Check if it's imported elsewhere first — if it's only used in the route definition, it can be removed.

- [ ] **Step 2: Update CSS import in doctor-dashboard.css**

Find this line in `doctor-dashboard.css`:
```css
@import './doctor-patients.css';
```

Add after it:
```css
@import './doctor-split-patients.css';
```
