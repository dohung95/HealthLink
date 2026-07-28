import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { aiClinicalContextApi } from '@api/aiClinicalContextApi';
import './ClinicalContextPanel.css';

const GROUPS = [
  {
    title: 'Symptoms and clinical notes',
    description: 'Information reported for this appointment.',
    keys: ['patientReportedSymptoms', 'reasonForVisit'],
    targetTab: 'notes',
    actionLabel: 'Open consultation notes',
  },
  {
    title: 'Verified laboratory reports',
    description: 'Only doctor-verified reports are included in the AI snapshot.',
    keys: ['verifiedLabReportIds'],
    targetTab: 'clinical-results',
    actionLabel: 'Open clinical results',
  },
  {
    title: 'Appointment vitals',
    description: 'The latest measurements recorded for this consultation.',
    keys: [
      'heartRate',
      'systolicBloodPressure',
      'diastolicBloodPressure',
      'temperature',
      'spo2',
      'respiratoryRate',
      'glucose',
    ],
    targetTab: 'patient-summary',
    actionLabel: 'View patient summary',
  },
  {
    title: 'Allergies and conditions',
    description: 'Safety context from the patient record.',
    keys: ['allergies', 'chronicConditions', 'currentMedications', 'medicalHistorySummary'],
    targetTab: 'history',
    actionLabel: 'Open medical history',
  },
  {
    title: 'Demographics and anthropometrics',
    description: 'Profile and derived factors used to interpret the encounter.',
    keys: [
      'ageYears',
      'sex',
      'heightCm',
      'weightKg',
      'bmi',
      'bloodType',
      'pregnancyStatus',
      'renalHepaticContext',
    ],
    targetTab: 'history',
    actionLabel: 'Open medical history',
  },
];

const LABELS = {
  patientReportedSymptoms: 'Patient-reported symptoms',
  reasonForVisit: 'Reason for visit',
  verifiedLabReportIds: 'Verified lab reports',
  heartRate: 'Heart rate',
  systolicBloodPressure: 'Systolic BP',
  diastolicBloodPressure: 'Diastolic BP',
  temperature: 'Temperature',
  spo2: 'SpO2',
  respiratoryRate: 'Respiratory rate',
  glucose: 'Glucose',
  allergies: 'Allergies',
  chronicConditions: 'Chronic conditions',
  currentMedications: 'Current medications',
  medicalHistorySummary: 'History summary',
  ageYears: 'Age',
  sex: 'Sex',
  heightCm: 'Height',
  weightKg: 'Weight',
  bmi: 'BMI',
  bloodType: 'Blood type',
  pregnancyStatus: 'Pregnancy status',
  renalHepaticContext: 'Renal/hepatic context',
};

function displayValue(value) {
  if (Array.isArray(value)) return value.length ? value.join(', ') : '\u2014';
  if (value === null || value === undefined || value === '') return '\u2014';
  return String(value);
}

function isEmptyContextValue(value) {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  return typeof value === 'string' && value.trim() === '';
}

function sourceLabel(field) {
  if (!field) return 'Unknown source';
  return [field.sourceType || 'UNKNOWN', field.freshness || 'UNKNOWN']
    .join(' · ')
    .replaceAll('_', ' ');
}

function ContextField({ name, field }) {
  if (isEmptyContextValue(field?.value)) {
    return (
      <div className="clinical-context-field clinical-context-field--empty">
        <div className="clinical-context-field__label-row">
          <span className="clinical-context-field__label">{LABELS[name] || name}</span>
        </div>
        <div className="clinical-context-field__value" aria-label="No data">{'\u2014'}</div>
      </div>
    );
  }
  const needsAttention = !field || field.freshness === 'UNKNOWN';
  const isStale = field?.freshness === 'STALE';

  return (
    <div className="clinical-context-field">
      <div className="clinical-context-field__label-row">
        <span className="clinical-context-field__label">{LABELS[name] || name}</span>
        <span
          className={`clinical-context-field__state ${
            needsAttention || isStale ? 'clinical-context-field__state--attention' : ''
          }`}
        >
          {needsAttention ? 'Unknown' : field.freshness}
        </span>
      </div>
      <div className={`clinical-context-field__value ${needsAttention ? 'text-secondary' : ''}`}>
        {displayValue(field?.value)}
      </div>
      <div className="clinical-context-field__source">{sourceLabel(field)}</div>
    </div>
  );
}

export default function ClinicalContextPanel({
  appointmentId,
  canManage,
  onNavigateTab,
  onPreviewChange,
  onSaved,
  refreshKey = 0,
  hasExistingSuggestion = false,
}) {
  const [preview, setPreview] = useState(null);
  const [symptoms, setSymptoms] = useState('');
  const [workingDiagnosis, setWorkingDiagnosis] = useState('');
  const [loading, setLoading] = useState(Boolean(appointmentId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saveMessage, setSaveMessage] = useState(null);
  const appointmentRef = useRef(appointmentId);
  const previousAppointmentRef = useRef(appointmentId);
  const resetAppointmentRef = useRef(appointmentId);
  const loadSequenceRef = useRef(0);
  const saveSequenceRef = useRef(0);

  appointmentRef.current = appointmentId;
  if (previousAppointmentRef.current !== appointmentId) {
    loadSequenceRef.current += 1;
    saveSequenceRef.current += 1;
    previousAppointmentRef.current = appointmentId;
  }

  const applyPreview = useCallback((next) => {
    setPreview(next);
    setSymptoms(next?.fields?.symptoms?.value || '');
    setWorkingDiagnosis(next?.fields?.workingDiagnosis?.value || '');
    onPreviewChange?.(next);
  }, [onPreviewChange]);

  const load = useCallback(async () => {
    if (!appointmentId) {
      setLoading(false);
      return;
    }
    const requestAppointmentId = appointmentId;
    const requestSequence = ++loadSequenceRef.current;
    setLoading(true);
    setError(null);
    try {
      const next = await aiClinicalContextApi.get(requestAppointmentId);
      if (appointmentRef.current !== requestAppointmentId
        || loadSequenceRef.current !== requestSequence) {
        return;
      }
      applyPreview(next);
    } catch (requestError) {
      if (appointmentRef.current !== requestAppointmentId
        || loadSequenceRef.current !== requestSequence) {
        return;
      }
      if (requestError.response?.status === 401 || requestError.response?.status === 403) {
        setError('You are not authorized to view this clinical context.');
      } else {
        setError('Clinical context could not be loaded. Try again.');
      }
    } finally {
      if (appointmentRef.current === requestAppointmentId
        && loadSequenceRef.current === requestSequence) {
        setLoading(false);
      }
    }
  }, [appointmentId, applyPreview]);

  useEffect(() => {
    if (resetAppointmentRef.current === appointmentId) return;
    resetAppointmentRef.current = appointmentId;
    setPreview(null);
    setSymptoms('');
    setWorkingDiagnosis('');
    setError(null);
    setSaveMessage(null);
    setSaving(false);
    setLoading(Boolean(appointmentId));
  }, [appointmentId]);

  useEffect(() => {
    if (refreshKey !== null) void load();
  }, [load, refreshKey]);

  const originalSymptoms = preview?.fields?.symptoms?.value || '';
  const originalDiagnosis = preview?.fields?.workingDiagnosis?.value || '';
  const isDirty = symptoms !== originalSymptoms || workingDiagnosis !== originalDiagnosis;
  const canSave = canManage
    && isDirty
    && symptoms.trim().length > 0
    && symptoms.trim().length <= 4000
    && workingDiagnosis.trim().length <= 2000
    && !saving;
  const unknownCount = useMemo(
    () => Object.values(preview?.fields || {}).filter(
      (item) => item?.freshness === 'UNKNOWN'
        || item?.value === null
        || item?.value === undefined
        || item?.value === '',
    ).length,
    [preview],
  );

  const save = async (event) => {
    event.preventDefault();
    if (!canSave || !preview) return;
    const requestAppointmentId = appointmentId;
    const requestSequence = ++saveSequenceRef.current;
    setSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      const next = await aiClinicalContextApi.update(requestAppointmentId, {
        symptoms: symptoms.trim(),
        workingDiagnosis: workingDiagnosis.trim() || null,
        expectedContextVersion: preview.contextVersion,
      });
      if (appointmentRef.current !== requestAppointmentId
        || saveSequenceRef.current !== requestSequence) {
        return;
      }
      applyPreview(next);
      setSaveMessage('Clinical context saved. Generate a new suggestion when you are ready.');
      onSaved?.(next);
    } catch (requestError) {
      if (appointmentRef.current !== requestAppointmentId
        || saveSequenceRef.current !== requestSequence) {
        return;
      }
      if (requestError.response?.status === 409) {
        setError('This context was changed elsewhere. Reload the latest context before saving again.');
      } else if (requestError.response?.status === 401 || requestError.response?.status === 403) {
        setError('You are not authorized to update this clinical context.');
      } else {
        setError('Clinical context could not be saved. Check the required fields and try again.');
      }
    } finally {
      if (appointmentRef.current === requestAppointmentId
        && saveSequenceRef.current === requestSequence) {
        setSaving(false);
      }
    }
  };

  if (loading) {
    return (
      <section className="clinical-context-panel clinical-context-panel--loading" aria-label="Clinical context">
        <div className="placeholder-glow" aria-label="Loading clinical context">
          <span className="placeholder col-5" />
          <span className="placeholder col-10 d-block mt-3" />
          <span className="placeholder col-8 d-block mt-2" />
          <span className="placeholder col-9 d-block mt-4" />
        </div>
      </section>
    );
  }

  if (error && !preview) {
    return (
      <section className="clinical-context-panel" aria-label="Clinical context">
        <h3 className="clinical-context-panel__title">Clinical context unavailable</h3>
        <p className="text-secondary mb-3">{error}</p>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={load}>
          Retry
        </button>
      </section>
    );
  }

  return (
    <section className="clinical-context-panel" aria-label="Clinical context">
      <header className="clinical-context-panel__header">
        <div>
          <p className="clinical-context-panel__eyebrow">Step 1</p>
          <h3 className="clinical-context-panel__title">Confirm clinical context</h3>
          <p className="clinical-context-panel__description">
            Check every source before creating an immutable AI snapshot.
          </p>
        </div>
        <span className={`clinical-context-panel__readiness ${
          preview?.ready ? 'clinical-context-panel__readiness--ready' : ''
        }`}>
          {preview?.ready ? 'Ready' : 'Needs review'}
        </span>
      </header>

      {error ? <div className="alert alert-warning" role="alert">{error}</div> : null}
      {saveMessage ? <div className="alert alert-success" role="status">{saveMessage}</div> : null}

      <div className="clinical-context-panel__meta">
        <span>Context version {preview?.contextVersion ?? 'Unknown'}</span>
        <span>{unknownCount} field(s) need attention</span>
      </div>

      <form onSubmit={save} className="clinical-context-editor">
        <div className="clinical-context-editor__field">
          <label className="form-label fw-semibold" htmlFor={`clinical-context-symptoms-${appointmentId}`}>
            Symptoms
          </label>
          <textarea
            id={`clinical-context-symptoms-${appointmentId}`}
            aria-label="Symptoms"
            className="form-control"
            rows="4"
            value={symptoms}
            maxLength="4000"
            required
            disabled={!canManage || saving}
            onChange={(event) => setSymptoms(event.target.value)}
          />
          <div className="form-text">Required. Record doctor-reviewed symptoms for this appointment.</div>
        </div>

        <div className="clinical-context-editor__field">
          <label className="form-label fw-semibold" htmlFor={`clinical-context-diagnosis-${appointmentId}`}>
            Working diagnosis
          </label>
          <textarea
            id={`clinical-context-diagnosis-${appointmentId}`}
            aria-label="Working diagnosis"
            className="form-control"
            rows="2"
            value={workingDiagnosis}
            maxLength="2000"
            disabled={!canManage || saving}
            onChange={(event) => setWorkingDiagnosis(event.target.value)}
          />
          <div className="form-text">Optional. This remains a doctor-authored working diagnosis.</div>
        </div>

        {hasExistingSuggestion && isDirty ? (
          <div className="clinical-context-editor__stale-note" role="status">
            Saving these changes will make the current AI suggestion outdated. The previous suggestion remains
            preserved in the audit trail.
          </div>
        ) : null}

        {canManage ? (
          <button type="submit" className="btn btn-outline-success" disabled={!canSave}>
            {saving ? 'Saving clinical context...' : 'Save clinical context'}
          </button>
        ) : (
          <p className="clinical-context-panel__readonly mb-0">
            This context is read-only for the current appointment state.
          </p>
        )}
      </form>

      {!preview?.ready ? (
        <div className="clinical-context-blockers" role="status">
          <strong>Readiness checks</strong>
          <ul>
            {(preview?.blockers || []).map((blocker) => (
              <li key={blocker.code}>
                <strong>{blocker.code}</strong>: {blocker.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="clinical-context-groups">
        {GROUPS.map((group) => (
          <section className="clinical-context-group" key={group.title}>
            <div className="clinical-context-group__heading">
              <div>
                <h4>{group.title}</h4>
                <p>{group.description}</p>
              </div>
              {onNavigateTab ? (
                <button
                  type="button"
                  className="clinical-context-group__link"
                  onClick={() => onNavigateTab(group.targetTab)}
                >
                  {group.actionLabel}
                  <i className="bi bi-arrow-up-right" aria-hidden="true" />
                </button>
              ) : null}
            </div>
            <div className="clinical-context-group__fields">
              {group.keys.map((key) => (
                <ContextField key={key} name={key} field={preview?.fields?.[key]} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
