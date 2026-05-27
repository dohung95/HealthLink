import React, { useEffect, useMemo, useState } from 'react';
import { doctorService } from '../../../api/doctorApi';
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

const Field = ({ label, value }) => (
  <div className="d-flex flex-column p-3 rounded-3" style={{ gap: '0.15rem', background: 'var(--surface-container-lowest, #f8fafc)', border: '1px solid var(--border-light, #e2e8f0)' }}>
    <span style={{ fontSize: '0.7rem', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
    <strong style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: '700' }}>{value || 'N/A'}</strong>
  </div>
);

export default function DoctorPatientDetailView({ patient, onBack, onOpenAppointmentById }) {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!patient?.patientId) return;
    let mounted = true;

    const loadHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await doctorService.getMyDoctorPatientHistory(patient.patientId);
        if (mounted) setHistory(data);
      } catch (err) {
        console.error('Error loading patient history:', err);
        if (mounted) setError('Failed to load patient history');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadHistory();
    return () => {
      mounted = false;
    };
  }, [patient?.patientId]);

  const completedAppointments = useMemo(
    () => history?.appointments?.filter((appointment) => String(appointment.status || '').toLowerCase() === 'completed') || [],
    [history?.appointments],
  );

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="rounded-3 border border-surface-border bg-surface-container-lowest p-3 text-xs text-critical" role="alert">{error}</div>;
  }

  const data = history || patient;

  return (
    <div className="d-flex flex-column" style={{ gap: '1rem' }}>
      {/* Back button */}
      <button
        type="button"
        className="d-inline-flex align-items-center gap-2 btn"
        onClick={onBack}
        style={{ border: 'none', background: 'none', padding: 0, fontSize: '0.85rem', fontWeight: '600', color: '#64748b', cursor: 'pointer' }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#1564e8'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; }}
      >
        <i className="bi bi-arrow-left"></i>
        Back to patients
      </button>

      {/* Patient hero */}
      <div className="d-flex align-items-center gap-4 p-3 rounded-3 border border-surface-border bg-white">
        <div
          className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
          style={{
            width: '3.5rem',
            height: '3.5rem',
            background: 'var(--surface-container, #eef2f7)',
            fontSize: '1.25rem',
            fontWeight: '700',
            color: 'var(--text-light-secondary, #475569)',
            overflow: 'hidden',
          }}
        >
          {data.avatarUrl ? <img alt="" src={data.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span>{(data.fullName || 'P').charAt(0).toUpperCase()}</span>}
        </div>
        <div>
          <p className="mb-1 text-uppercase" style={{ fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.08em', color: 'var(--text-light-secondary)' }}>Patient</p>
          <h3 style={{ color: '#111827', fontSize: '1.15rem', fontWeight: '700', margin: 0 }}>{data.fullName}</h3>
          <p style={{ fontSize: '0.825rem', color: '#64748b', margin: '0.15rem 0 0 0' }}>{data.email || data.phoneNumber || 'No contact listed'}</p>
        </div>
      </div>

      {/* Patient info grid */}
      <div className="rounded-3 border border-surface-border bg-white p-3">
        <p className="mb-1 text-uppercase" style={{ fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.08em', color: 'var(--text-light-secondary)' }}>Patient Information</p>
        <div className="row g-2 mt-2">
          <div className="col-6 col-md-4 col-lg-3"><Field label="Phone" value={data.phoneNumber} /></div>
          <div className="col-6 col-md-4 col-lg-3"><Field label="Gender" value={data.gender} /></div>
          <div className="col-6 col-md-4 col-lg-3"><Field label="Blood Type" value={data.bloodType} /></div>
          <div className="col-6 col-md-4 col-lg-3"><Field label="DOB" value={data.dateOfBirth ? new Date(data.dateOfBirth).toLocaleDateString() : null} /></div>
          <div className="col-6 col-md-4 col-lg-3"><Field label="Completed Visits" value={completedAppointments.length} /></div>
          <div className="col-6 col-md-4 col-lg-3"><Field label="Prescriptions" value={history?.prescriptions?.length || 0} /></div>
        </div>
      </div>

      {/* Medical Summary */}
      <div className="rounded-3 border border-surface-border bg-white p-3">
        <p className="mb-1 text-uppercase" style={{ fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.08em', color: 'var(--text-light-secondary)' }}>Medical Summary</p>
        <div className="row g-2 mt-2">
          <div className="col-12 col-md-6"><Field label="History" value={data.medicalHistorySummary} /></div>
          <div className="col-12 col-md-6"><Field label="Allergies" value={data.allergies} /></div>
          <div className="col-12 col-md-6"><Field label="Chronic Conditions" value={data.chronicConditions} /></div>
          <div className="col-12 col-md-6"><Field label="Current Medications" value={data.currentMedications} /></div>
        </div>
      </div>

      {/* Appointment History */}
      <div className="rounded-3 border border-surface-border bg-white p-3">
        <p className="mb-1 text-uppercase" style={{ fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.08em', color: 'var(--text-light-secondary)' }}>Appointment History</p>
        <div className="d-flex flex-column mt-2" style={{ gap: '0.75rem' }}>
          {history?.appointments?.length ? history.appointments.map((appointment) => (
            <article
              className="d-flex align-items-center justify-content-between gap-3 p-3 rounded-3 border border-surface-border bg-white"
              key={appointment.appointmentId}
            >
              <div className="min-w-0">
                <strong style={{ color: '#0f172a', fontSize: '0.9rem', fontWeight: '700' }}>{formatDateTime(appointment.appointmentTime)}</strong>
                <p className="mb-0" style={{ fontSize: '0.8rem', color: '#64748b' }}>{appointment.consultationType || 'Consultation'} - {appointment.status}</p>
                {appointment.diagnosis ? <p className="mb-0 mt-1" style={{ fontSize: '0.8rem', color: '#475569' }}>Diagnosis: {appointment.diagnosis}</p> : null}
              </div>
              <button
                type="button"
                className="btn"
                onClick={() => onOpenAppointmentById?.(appointment.appointmentId)}
                style={{
                  border: '1px solid var(--border-light, #e2e8f0)',
                  borderRadius: '0.5rem',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  color: '#475569',
                  background: '#ffffff',
                  padding: '0.35rem 0.75rem',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#1564e8'; e.currentTarget.style.color = '#1564e8'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-light, #e2e8f0)'; e.currentTarget.style.color = '#475569'; }}
              >
                Open
              </button>
            </article>
          )) : (
            <p className="mb-0" style={{ fontSize: '0.8rem', color: '#64748b' }}>No appointments found.</p>
          )}
        </div>
      </div>

      {/* Prescriptions */}
      <div className="rounded-3 border border-surface-border bg-white p-3">
        <p className="mb-1 text-uppercase" style={{ fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.08em', color: 'var(--text-light-secondary)' }}>Prescriptions</p>
        <div className="d-flex flex-column mt-2" style={{ gap: '0.75rem' }}>
          {history?.prescriptions?.length ? history.prescriptions.map((prescription) => (
            <article
              className="d-flex align-items-center justify-content-between gap-3 p-3 rounded-3 border border-surface-border bg-white"
              key={prescription.prescriptionHeaderId}
            >
              <div className="min-w-0">
                <strong style={{ color: '#0f172a', fontSize: '0.9rem', fontWeight: '700' }}>{formatDateTime(prescription.issueDate)}</strong>
                <p className="mb-0" style={{ fontSize: '0.8rem', color: '#64748b' }}>{prescription.diagnosis || 'No diagnosis'} - {prescription.status || 'Issued'}</p>
                <p className="mb-0" style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{prescription.medications?.length || prescription.items?.length || 0} medication(s)</p>
              </div>
              {prescription.appointmentId ? (
                <button
                  type="button"
                  className="btn"
                  onClick={() => onOpenAppointmentById?.(prescription.appointmentId)}
                  style={{
                    border: '1px solid var(--border-light, #e2e8f0)',
                    borderRadius: '0.5rem',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: '#475569',
                    background: '#ffffff',
                    padding: '0.35rem 0.75rem',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#1564e8'; e.currentTarget.style.color = '#1564e8'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-light, #e2e8f0)'; e.currentTarget.style.color = '#475569'; }}
                >
                  Appointment
                </button>
              ) : null}
            </article>
          )) : (
            <p className="mb-0" style={{ fontSize: '0.8rem', color: '#64748b' }}>No prescriptions found.</p>
          )}
        </div>
      </div>

      {/* Documents */}
      <div className="rounded-3 border border-surface-border bg-white p-3">
        <p className="mb-1 text-uppercase" style={{ fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.08em', color: 'var(--text-light-secondary)' }}>Documents</p>
        <div className="d-flex flex-column mt-2" style={{ gap: '0.75rem' }}>
          {history?.documentsByCategory?.length ? history.documentsByCategory.map((category) => (
            <article
              className="d-flex align-items-center justify-content-between gap-3 p-3 rounded-3 border border-surface-border bg-white"
              key={category.category}
            >
              <div>
                <strong style={{ color: '#0f172a', fontSize: '0.9rem', fontWeight: '700' }}>{category.category}</strong>
                <p className="mb-0" style={{ fontSize: '0.8rem', color: '#64748b' }}>{category.documentCount} document(s)</p>
              </div>
            </article>
          )) : (
            <p className="mb-0" style={{ fontSize: '0.8rem', color: '#64748b' }}>No documents found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
