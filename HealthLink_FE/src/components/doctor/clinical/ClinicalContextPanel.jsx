import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { aiClinicalContextApi } from '@api/aiClinicalContextApi';

const GROUPS = [
  { title: 'Symptoms and clinical notes', keys: ['patientReportedSymptoms', 'reasonForVisit'] },
  { title: 'Verified laboratory reports', keys: ['verifiedLabReportIds'] },
  { title: 'Appointment vitals', keys: ['heartRate', 'systolicBloodPressure', 'diastolicBloodPressure', 'temperature', 'spo2', 'respiratoryRate', 'glucose'] },
  { title: 'Allergies and conditions', keys: ['allergies', 'chronicConditions', 'currentMedications', 'medicalHistorySummary'] },
  { title: 'Demographics and anthropometrics', keys: ['ageYears', 'sex', 'heightCm', 'weightKg', 'bmi', 'bloodType', 'pregnancyStatus', 'renalHepaticContext'] },
];

const LABELS = {
  patientReportedSymptoms: 'Patient-reported symptoms', reasonForVisit: 'Reason for visit',
  verifiedLabReportIds: 'Verified lab reports', heartRate: 'Heart rate', systolicBloodPressure: 'Systolic BP', diastolicBloodPressure: 'Diastolic BP',
  temperature: 'Temperature', spo2: 'SpO2', respiratoryRate: 'Respiratory rate', glucose: 'Glucose', allergies: 'Allergies',
  chronicConditions: 'Chronic conditions', currentMedications: 'Current medications', medicalHistorySummary: 'History summary', ageYears: 'Age',
  sex: 'Sex', heightCm: 'Height', weightKg: 'Weight', bmi: 'BMI', bloodType: 'Blood type', pregnancyStatus: 'Pregnancy status',
  renalHepaticContext: 'Renal/hepatic context',
};

function displayValue(value) {
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'Unknown';
  if (value === null || value === undefined || value === '') return 'Unknown';
  return String(value);
}

function sourceLabel(field) {
  if (!field) return 'Unknown source';
  return [field.sourceType || 'UNKNOWN', field.freshness || 'UNKNOWN'].join(' · ').replaceAll('_', ' ');
}

function ContextField({ name, field }) {
  const isUnknown = !field || field.value === null || field.value === undefined || field.value === '' || field.freshness === 'UNKNOWN';
  const isStale = field?.freshness === 'STALE';
  return <div className="border-top pt-2 mt-2">
    <div className="d-flex justify-content-between align-items-start gap-2"><span className="small text-muted">{LABELS[name] || name}</span><span className={`badge ${isUnknown || isStale ? 'text-bg-warning' : 'text-bg-light border text-dark'}`}>{isUnknown ? 'Unknown' : field.freshness}</span></div>
    <div className="fw-semibold text-break">{displayValue(field?.value)}</div>
    <div className="small text-muted text-uppercase">{sourceLabel(field)}</div>
  </div>;
}

export default function ClinicalContextPanel({ appointmentId, canManage }) {
  const [preview, setPreview] = useState(null);
  const [symptoms, setSymptoms] = useState('');
  const [workingDiagnosis, setWorkingDiagnosis] = useState('');
  const [loading, setLoading] = useState(Boolean(appointmentId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saveMessage, setSaveMessage] = useState(null);

  const applyPreview = useCallback((next) => {
    setPreview(next);
    setSymptoms(next?.fields?.symptoms?.value || '');
    setWorkingDiagnosis(next?.fields?.workingDiagnosis?.value || '');
  }, []);

  const load = useCallback(async () => {
    if (!appointmentId) return;
    setLoading(true);
    setError(null);
    try { applyPreview(await aiClinicalContextApi.get(appointmentId)); }
    catch (requestError) {
      if (requestError.response?.status === 401 || requestError.response?.status === 403) setError('You are not authorized to view this clinical context.');
      else setError('Clinical context could not be loaded. Try again.');
    } finally { setLoading(false); }
  }, [appointmentId, applyPreview]);

  useEffect(() => { load(); }, [load]);

  const canSave = canManage && symptoms.trim().length > 0 && symptoms.trim().length <= 4000 && !saving;
  const unknownCount = useMemo(() => Object.values(preview?.fields || {}).filter((item) => item?.freshness === 'UNKNOWN' || item?.value === null || item?.value === undefined || item?.value === '').length, [preview]);

  const save = async (event) => {
    event.preventDefault();
    if (!canSave || !preview) return;
    setSaving(true);
    setError(null);
    setSaveMessage(null);
    try {
      const next = await aiClinicalContextApi.update(appointmentId, {
        symptoms: symptoms.trim(),
        workingDiagnosis: workingDiagnosis.trim() || null,
        expectedContextVersion: preview.contextVersion,
      });
      applyPreview(next);
      setSaveMessage('Clinical context saved. The next AI workflow will create its immutable snapshot before generation.');
    } catch (requestError) {
      if (requestError.response?.status === 409) setError('This context was changed elsewhere. Reload the latest context before saving again.');
      else if (requestError.response?.status === 401 || requestError.response?.status === 403) setError('You are not authorized to update this clinical context.');
      else setError('Clinical context could not be saved. Check the required fields and try again.');
    } finally { setSaving(false); }
  };

  if (loading) return <section className="card border-0 shadow-sm mb-3" aria-label="Clinical context"><div className="card-body"><div className="placeholder-glow"><span className="placeholder col-4"></span><span className="placeholder col-9 d-block mt-3"></span><span className="placeholder col-7 d-block mt-2"></span></div></div></section>;
  if (error && !preview) return <section className="card border-warning-subtle mb-3" aria-label="Clinical context"><div className="card-body"><strong>Clinical context unavailable</strong><p className="text-muted mb-2">{error}</p><button type="button" className="btn btn-outline-secondary btn-sm" onClick={load}>Retry</button></div></section>;

  return <section className="card border-primary-subtle shadow-sm mb-3" aria-label="Clinical context">
    <div className="card-header bg-white d-flex flex-wrap justify-content-between align-items-center gap-2"><div><strong>AI clinical context</strong><div className="small text-muted">Review sources before an AI suggestion is introduced.</div></div><span className={`badge ${preview?.ready ? 'text-bg-success' : 'text-bg-warning'}`}>{preview?.ready ? 'Ready' : 'Needs review'}</span></div>
    <div className="card-body">
      {error && <div className="alert alert-warning" role="alert">{error}</div>}
      {saveMessage && <div className="alert alert-success" role="status">{saveMessage}</div>}
      <div className="d-flex flex-wrap gap-2 mb-3"><span className="small text-muted">Context version {preview?.contextVersion ?? 'Unknown'}</span><span className="small text-muted">{unknownCount} field(s) require review</span></div>
      <form onSubmit={save} className="border-bottom pb-3 mb-3">
        <div className="mb-3"><label className="form-label fw-semibold" htmlFor={`clinical-context-symptoms-${appointmentId}`}>Symptoms</label><textarea id={`clinical-context-symptoms-${appointmentId}`} aria-label="Symptoms" className="form-control" rows="3" value={symptoms} maxLength="4000" required disabled={!canManage || saving} onChange={(event) => setSymptoms(event.target.value)} /><div className="form-text">Required, up to 4,000 characters. Record the doctor-reviewed appointment symptoms.</div></div>
        <div className="mb-3"><label className="form-label fw-semibold" htmlFor={`clinical-context-diagnosis-${appointmentId}`}>Working diagnosis</label><input id={`clinical-context-diagnosis-${appointmentId}`} aria-label="Working diagnosis" className="form-control" value={workingDiagnosis} maxLength="2000" disabled={!canManage || saving} onChange={(event) => setWorkingDiagnosis(event.target.value)} /><div className="form-text">Optional, up to 2,000 characters.</div></div>
        {canManage ? <button type="submit" className="btn btn-primary" disabled={!canSave}>{saving ? 'Saving clinical context...' : 'Save clinical context'}</button> : <p className="small text-muted mb-0">This clinical context is read-only for the current appointment state.</p>}
      </form>
      {!preview?.ready && <div className="alert alert-warning"><strong>Readiness checks</strong><ul className="mb-0 mt-2">{(preview?.blockers || []).map((blocker) => <li key={blocker.code}><strong>{blocker.code}</strong>: {blocker.message}</li>)}</ul></div>}
      <div className="row g-3">{GROUPS.map((group) => <div className="col-12 col-lg-6" key={group.title}><div className="border rounded p-3 h-100"><h3 className="h6 mb-0">{group.title}</h3>{group.keys.map((key) => <ContextField key={key} name={key} field={preview?.fields?.[key]} />)}</div></div>)}</div>
    </div>
  </section>;
}
