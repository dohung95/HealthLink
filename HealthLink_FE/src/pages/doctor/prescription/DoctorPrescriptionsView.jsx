import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { prescriptionService } from '@api/prescriptionApi';
import { doctorService } from '@api/doctorApi';
import { DoctorSkeletonList } from '@components/doctor/DoctorSkeleton';
import DoctorEmptyState from '@components/doctor/DoctorEmptyState';
import DoctorErrorState from '@components/doctor/DoctorErrorState';
import PrintPrescriptionModal from '@components/doctor/PrintPrescriptionModal';

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const STATUS_STYLES = {
  ACTIVE: { bg: '#d1fae5', text: '#059669', dot: '#10b981', border: '#6ee7b7', pillBg: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)' },
  ISSUED: { bg: '#fef3c7', text: '#b45309', dot: '#d97706', border: '#fcd34d', pillBg: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' },
  EXPIRED: { bg: '#f1f5f9', text: '#64748b', dot: '#94a3b8', border: '#cbd5e1', pillBg: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)' },
};
const DEFAULT_STATUS = { bg: '#f1f5f9', text: '#64748b', dot: '#94a3b8', border: '#cbd5e1', pillBg: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)' };
const getStatusStyle = (status) => STATUS_STYLES[status] || DEFAULT_STATUS;

export default function DoctorPrescriptionsView() {
  const { doctorId } = useOutletContext();
  const [prescriptions, setPrescriptions] = useState([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState(null);
  const [patientProfile, setPatientProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!doctorId) return;
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await prescriptionService.getDoctorPrescriptions(doctorId);
        if (mounted) setPrescriptions(data);
      } catch (err) {
        console.error('Error loading prescriptions:', err);
        if (mounted) { setError(err.response?.data?.message || 'Failed to load prescriptions'); setPrescriptions([]); }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [doctorId]);

  useEffect(() => {
    if (!selected?.patientId && !selected?.patientID) { setPatientProfile(null); return; }
    let mounted = true;
    const loadProfile = async () => {
      setProfileLoading(true);
      try {
        const pid = selected.patientId || selected.patientID;
        const data = await doctorService.getPatientById(pid);
        if (mounted) setPatientProfile(data);
      } catch {
        if (mounted) setPatientProfile(null);
      } finally {
        if (mounted) setProfileLoading(false);
      }
    };
    loadProfile();
    return () => { mounted = false; };
  }, [selected?.prescriptionHeaderId]);

  const statuses = useMemo(() => {
    const values = new Set(prescriptions.map((item) => item.status || 'ISSUED'));
    return ['all', ...values];
  }, [prescriptions]);

  const statusCounts = useMemo(() => {
    const counts = { all: prescriptions.length };
    prescriptions.forEach((p) => { const s = p.status || 'ISSUED'; counts[s] = (counts[s] || 0) + 1; });
    return counts;
  }, [prescriptions]);

  const filteredPrescriptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return prescriptions.filter((p) => {
      if (status !== 'all' && p.status !== status) return false;
      if (!q) return true;
      const searchStr = [
        p.prescriptionHeaderId?.toString(),
        p.patientName,
        ...(p.medications || []).map((m) => m.medicationName),
      ].filter(Boolean).join(' ').toLowerCase();
      return searchStr.includes(q) || q.startsWith('rx-') || q.startsWith(String(p.prescriptionHeaderId));
    });
  }, [prescriptions, query, status]);

  const sortedPrescriptions = useMemo(() => {
    return [...filteredPrescriptions].sort((a, b) => {
      return new Date(b.issueDate || 0) - new Date(a.issueDate || 0);
    });
  }, [filteredPrescriptions]);

  const handleSelect = useCallback((prescription) => {
    setSelected(prescription);
    setPatientProfile(null);
  }, []);

  const medications = selected ? (selected.medications || selected.items || []) : [];
  const patientName = patientProfile?.fullName || selected?.patientName || 'Unknown Patient';

  return (
    <div className="doctor-content-section px-3 px-xl-4 py-3 py-md-4" style={{ minHeight: 'calc(100dvh - 100px)' }}>
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes statusPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>

      {/* Search + Filter */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div className="position-relative flex-grow-1" style={{ maxWidth: '320px' }}>
          <span className="material-symbols-outlined position-absolute top-50 start-0 translate-middle-y ms-3" style={{ fontSize: '1.125rem', color: 'var(--doctor-text-muted, #64748b)' }}>search</span>
          <input
            aria-label="Search prescriptions"
            className="form-control rounded-pill"
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by ID, patient, or medication..."
            value={query}
            style={{ border: '1.5px solid var(--doctor-border, #e2e8f0)', background: 'var(--doctor-surface, #ffffff)', fontSize: '0.875rem', padding: '0.5rem 1rem 0.5rem 2.75rem' }}
          />
          {query && (
            <button className="position-absolute top-50 end-0 translate-middle-y border-0 bg-transparent me-3 p-0" onClick={() => setQuery('')} type="button" aria-label="Clear search">
              <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--doctor-text-muted, #64748b)' }}>close</span>
            </button>
          )}
        </div>
        <div className="d-flex gap-2 flex-wrap">
          {statuses.map((value) => (
            <button
              key={value}
              className="btn btn-sm rounded-pill px-3"
              onClick={() => setStatus(value)}
              type="button"
              style={{
                fontSize: '0.8125rem', fontWeight: 600,
                background: status === value ? 'var(--doctor-primary, #0052cc)' : 'var(--doctor-surface-muted, #f8fafc)',
                border: 'none',
                color: status === value ? '#fff' : 'var(--doctor-text-secondary, #475569)',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              {value === 'all' ? 'All' : value}
              <span className="ms-1 fw-normal" style={{ opacity: 0.7 }}>({statusCounts[value] || 0})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <DoctorSkeletonList rows={5} />
      ) : error ? (
        <DoctorErrorState message={error} onRetry={() => window.location.reload()} />
      ) : sortedPrescriptions.length === 0 ? (
        <DoctorEmptyState
          icon="medication"
          title={query || status !== 'all' ? 'No matching prescriptions' : 'No prescriptions found'}
          description={query || status !== 'all' ? 'Try adjusting your search or filter criteria.' : 'Issued prescriptions will appear here.'}
        />
      ) : (
        <div className="row g-4" style={{ height: 'calc(100dvh - 280px)', minHeight: '480px' }}>
          {/* List Column - 3/12 */}
          <div className="col-md-3 d-flex flex-column" style={{ height: '100%' }}>
            <div className="flex-grow-1 d-flex flex-column gap-2 overflow-y-auto" style={{ minHeight: 0 }}>
              {sortedPrescriptions.map((prescription, index) => {
                const isSelected = selected?.prescriptionHeaderId === prescription.prescriptionHeaderId;
                const medCount = (prescription.medications || prescription.items || []).length;
                const dateStr = prescription.issueDate ? formatDate(prescription.issueDate) : '';
                const rxId = prescription.prescriptionHeaderId
                  ? `RX-${String(prescription.prescriptionHeaderId).padStart(4, '0')}`
                  : `RX-${index + 1}`;
                return (
                  <article
                    key={prescription.prescriptionHeaderId ?? `rx-${index}`}
                    className="position-relative overflow-hidden rounded-4"
                    onClick={() => handleSelect(prescription)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect(prescription); } }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Select prescription ${rxId}`}
                    onMouseEnter={(e) => { if (!isSelected) { e.currentTarget.style.background = 'var(--doctor-primary-subtle, #f4f8ff)'; e.currentTarget.style.borderColor = 'var(--doctor-primary-border, #b8d4ff)'; } }}
                    onMouseLeave={(e) => { if (!isSelected) { e.currentTarget.style.background = 'var(--doctor-surface, #ffffff)'; e.currentTarget.style.borderColor = 'var(--doctor-border, #e2e8f0)'; } }}
                    style={{
                      background: isSelected ? 'var(--doctor-primary-soft, #eaf2ff)' : 'var(--doctor-surface, #ffffff)',
                      border: isSelected ? '1.5px solid var(--doctor-primary, #0052cc)' : '1px solid var(--doctor-border, #e2e8f0)',
                      cursor: 'pointer',
                      padding: '0.875rem 1rem 0.875rem 0.875rem',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      animation: index < 20 ? `fadeSlideIn 0.35s ease ${index * 0.04}s both` : 'none',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--doctor-primary, #0052cc)', fontWeight: 600, display: 'block', lineHeight: 1.3 }}>
                        {dateStr}
                      </span>
                      <div className="d-flex align-items-center justify-content-between mt-1">
                        <span className="fw-bold" style={{ fontSize: '0.9375rem', color: 'var(--doctor-text, #0f172a)', letterSpacing: '0.01em' }}>
                          {rxId}
                        </span>
                        <span aria-label={prescription.status || 'ISSUED'} style={{
                          width: '9px', height: '9px', borderRadius: '50%',
                          background: getStatusStyle(prescription.status).dot,
                          display: 'inline-block', flexShrink: 0,
                          boxShadow: `0 0 0 2px ${getStatusStyle(prescription.status).bg}`,
                          animation: prescription.status === 'ACTIVE' ? 'statusPulse 2s ease-in-out infinite' : 'none',
                        }} />
                      </div>
                      <p className="mb-0 small" style={{ color: 'var(--doctor-text-muted, #64748b)', marginTop: '0.0625rem', fontSize: '0.75rem' }}>
                        {medCount} med{medCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          {/* Right Column - 9/12 */}
          <aside className="col-md-9 d-flex" style={{ height: '100%' }}>
            {selected ? (
              <div className="w-100 rounded-4" style={{ background: 'var(--doctor-surface-muted, #f8fafc)', border: '1px solid var(--doctor-border, #e2e8f0)', padding: '1.25rem', height: '100%' }}>
                <div className="row g-3" style={{ height: '100%' }}>
                  {/* Left sub-panel: Info + Diagnosis + Notes + Patient - 5/12 */}
                  <div className="col-md-5 d-flex flex-column" style={{ height: '100%' }}>
                    <div className="d-flex flex-column gap-3 overflow-y-auto pe-1" style={{ minHeight: 0 }}>
                      {/* Prescription Info */}
                      <div className="rounded-4 p-4" style={{ background: 'var(--doctor-primary-soft, #eaf2ff)', border: '1px solid var(--doctor-primary-border, #b8d4ff)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                        <div className="d-flex align-items-center justify-content-between">
                          <h5 className="fw-bold mb-0" style={{ color: 'var(--doctor-text, #0f172a)' }}>
                            RX-{String(selected.prescriptionHeaderId).padStart(4, '0')}
                          </h5>
                          <span className="small fw-semibold d-inline-flex align-items-center px-3 py-1 rounded-pill" style={{
                            columnGap: '0.375rem',
                            background: getStatusStyle(selected.status).pillBg,
                            color: getStatusStyle(selected.status).text,
                            border: `1px solid ${getStatusStyle(selected.status).border}`,
                            fontSize: '0.6875rem',
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            userSelect: 'none',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                          }}>
                            <span style={{
                              width: '7px', height: '7px', borderRadius: '50%',
                              background: getStatusStyle(selected.status).dot,
                              display: 'inline-block', flexShrink: 0,
                              animation: selected.status === 'ACTIVE' ? 'statusPulse 2s ease-in-out infinite' : 'none',
                              boxShadow: `0 0 0 2px ${getStatusStyle(selected.status).bg}`,
                            }} />
                            {selected.status || 'ISSUED'}
                          </span>
                        </div>
                      </div>

                      {/* Diagnosis */}
                      {selected.diagnosis && (
                        <div>
                          <div className="d-flex align-items-center gap-2 mb-1 px-1">
                            <span className="material-symbols-outlined" style={{ fontSize: '0.8125rem', color: 'var(--doctor-text-muted, #64748b)' }}>biotech</span>
                            <span className="small fw-semibold" style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--doctor-text-muted, #64748b)' }}>Diagnosis</span>
                          </div>
                          <div className="rounded-4 p-4" style={{ background: 'var(--doctor-surface, #ffffff)', border: '1px solid var(--doctor-border, #e2e8f0)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                            <p className="mb-0" style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--doctor-text, #0f172a)', lineHeight: 1.5 }}>{selected.diagnosis}</p>
                          </div>
                        </div>
                      )}

                      {/* Doctor Notes */}
                      {selected.notes && (
                        <div>
                          <div className="d-flex align-items-center gap-2 mb-1 px-1">
                            <span className="material-symbols-outlined" style={{ fontSize: '0.8125rem', color: 'var(--doctor-text-muted, #64748b)' }}>description</span>
                            <span className="small fw-semibold" style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--doctor-text-muted, #64748b)' }}>Doctor Notes</span>
                          </div>
                          <div className="rounded-4 p-4" style={{ background: 'var(--doctor-surface, #ffffff)', border: '1px solid var(--doctor-border, #e2e8f0)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                            <p className="mb-0" style={{ fontSize: '0.875rem', lineHeight: 1.6, whiteSpace: 'pre-line', color: 'var(--doctor-text, #0f172a)' }}>{selected.notes}</p>
                          </div>
                        </div>
                      )}

                      {/* Patient Information */}
                      <div>
                        <div className="d-flex align-items-center gap-2 mb-1 px-1">
                          <span className="material-symbols-outlined" style={{ fontSize: '0.8125rem', color: 'var(--doctor-text-muted, #64748b)' }}>person</span>
                          <span className="small fw-semibold" style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--doctor-text-muted, #64748b)' }}>Patient Information</span>
                        </div>
                        <div className="rounded-4 p-4" style={{ background: 'var(--doctor-surface, #ffffff)', border: '1px solid var(--doctor-border, #e2e8f0)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                          {profileLoading ? (
                            <div className="d-flex align-items-center gap-2 py-2">
                              <div className="spinner-border spinner-border-sm" role="status" style={{ color: 'var(--doctor-primary, #0052cc)' }} />
                              <span style={{ fontSize: '0.8125rem', color: 'var(--doctor-text-muted, #64748b)' }}>Loading patient...</span>
                            </div>
                          ) : (
                            <div className="d-flex flex-column" style={{ gap: '0.875rem' }}>
                              {/* Name - hero */}
                              <div className="d-flex align-items-center gap-3 pb-3" style={{ borderBottom: '1px solid var(--doctor-border, #e2e8f0)' }}>
                                <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: '2.75rem', height: '2.75rem', background: 'var(--doctor-primary-soft, #eaf2ff)' }}>
                                  <span className="fw-bold" style={{ fontSize: '1rem', color: 'var(--doctor-primary, #0052cc)' }}>
                                    {patientName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <p className="mb-0 fw-semibold" style={{ fontSize: '0.9375rem', color: 'var(--doctor-text, #0f172a)', lineHeight: 1.3 }}>{patientName}</p>
                                  <p className="mb-0" style={{ fontSize: '0.75rem', color: 'var(--doctor-text-muted, #64748b)' }}>
                                    PID: {selected.patientId || selected.patientID || '—'}
                                  </p>
                                </div>
                              </div>

                              {/* Fields grid */}
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
                                  {patientProfile?.email && (
                                    <div className="d-flex align-items-center gap-2 px-1">
                                      <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: '0.875rem', color: 'var(--doctor-text-muted, #64748b)' }}>mail</span>
                                      <p className="mb-0 text-truncate" style={{ fontSize: '0.8125rem', color: 'var(--doctor-text, #0f172a)', lineHeight: 1.3 }}>{patientProfile.email}</p>
                                    </div>
                                  )}
                                  {patientProfile?.phoneNumber && (
                                    <div className="d-flex align-items-center gap-2 px-1">
                                      <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: '0.875rem', color: 'var(--doctor-text-muted, #64748b)' }}>call</span>
                                      <p className="mb-0" style={{ fontSize: '0.8125rem', color: 'var(--doctor-text, #0f172a)', lineHeight: 1.3 }}>{patientProfile.phoneNumber}</p>
                                    </div>
                                  )}
                                  {patientProfile?.dateOfBirth && (
                                    <div className="d-flex align-items-center gap-2 px-1">
                                      <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: '0.875rem', color: 'var(--doctor-text-muted, #64748b)' }}>cake</span>
                                      <p className="mb-0" style={{ fontSize: '0.8125rem', color: 'var(--doctor-text, #0f172a)', lineHeight: 1.3 }}>{formatDate(patientProfile.dateOfBirth)}</p>
                                    </div>
                                  )}
                                  {patientProfile?.gender && (
                                    <div className="d-flex align-items-center gap-2 px-1">
                                      <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: '0.875rem', color: 'var(--doctor-text-muted, #64748b)' }}>wc</span>
                                      <p className="mb-0" style={{ fontSize: '0.8125rem', color: 'var(--doctor-text, #0f172a)', lineHeight: 1.3 }}>{patientProfile.gender}</p>
                                    </div>
                                  )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right sub-panel: Medications - 7/12 */}
                  <div className="col-md-7 d-flex flex-column" style={{ height: '100%' }}>
                    <div className="rounded-4 p-4 d-flex flex-column" style={{ background: 'var(--doctor-surface, #ffffff)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', flex: 1, minHeight: 0 }}>
                      {/* Header row */}
                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <h6 className="mb-0 fw-semibold d-flex align-items-center gap-2">
                          <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: 'var(--doctor-text-muted, #64748b)' }}>medication</span>
                          Medications
                          <span className="small fw-semibold ms-1 px-2 py-0 rounded-pill" style={{ background: 'var(--doctor-primary-soft, #eaf2ff)', color: 'var(--doctor-primary, #0052cc)', fontSize: '0.75rem' }}>
                            {medications.length}
                          </span>
                        </h6>
                        <button
                          className="btn btn-sm d-inline-flex align-items-center gap-1 rounded-pill px-3 py-1 border-0"
                          onClick={() => setShowPrintModal(true)}
                          type="button"
                          title="Print / Save as PDF"
                          style={{ background: 'var(--doctor-primary, #0052cc)', color: '#fff', fontWeight: 600, fontSize: '0.75rem', transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,82,204,0.35)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                          onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.97)'; }}
                          onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>local_printshop</span>
                        </button>
                      </div>

                      {/* Scrollable medications */}
                      <div className="overflow-y-auto" style={{ flex: 1, minHeight: 0 }}>
                        {medications.length === 0 ? (
                          <div className="text-center py-4 rounded-3" style={{ background: 'var(--doctor-surface-muted, #f8fafc)', border: '1px dashed var(--doctor-border, #e2e8f0)' }}>
                            <span className="material-symbols-outlined d-block mb-2" style={{ fontSize: '1.5rem', color: 'var(--doctor-text-muted, #64748b)' }}>medication</span>
                            <p className="mb-0" style={{ fontSize: '0.8125rem', color: 'var(--doctor-text-muted, #64748b)' }}>No medication details available</p>
                          </div>
                        ) : (
                          <div className="d-flex flex-column gap-2">
                            {medications.map((item, index) => (
                              <div key={`${item.medicationName || 'med'}-${index}`}
                                className="rounded-3"
                                style={{ border: '1px solid var(--doctor-border, #e2e8f0)', background: 'var(--doctor-surface, #ffffff)', padding: '0.75rem 1rem' }}
                              >
                                <div className="d-flex align-items-center justify-content-between pb-2 mb-2" style={{ borderBottom: '1px solid var(--doctor-border, #e2e8f0)' }}>
                                  <span className="fw-semibold" style={{ fontSize: '0.875rem', color: 'var(--doctor-text, #0f172a)' }}>
                                    {item.medicationName || `Medication ${index + 1}`}
                                  </span>
                                  {item.dosage && (
                                    <span className="small fw-semibold" style={{ color: 'var(--doctor-primary, #0052cc)' }}>{item.dosage}</span>
                                  )}
                                </div>
                                <div className="d-flex flex-wrap gap-1">
                                  {item.route && (
                                    <span className="small rounded-pill" style={{ background: 'var(--doctor-primary-soft, #eaf2ff)', border: '1px solid transparent', color: 'var(--doctor-primary, #0052cc)', padding: '0.125rem 0.5rem', fontSize: '0.75rem' }}>
                                      {item.route}
                                    </span>
                                  )}
                                  {item.frequency && (
                                    <span className="small rounded-pill" style={{ background: 'var(--doctor-surface-muted, #f8fafc)', border: '1px solid var(--doctor-border, #e2e8f0)', color: 'var(--doctor-text-secondary, #475569)', padding: '0.125rem 0.5rem', fontSize: '0.75rem' }}>
                                      {item.frequency}
                                    </span>
                                  )}
                                  {item.duration && (
                                    <span className="small rounded-pill" style={{ background: 'var(--doctor-surface-muted, #f8fafc)', border: '1px solid var(--doctor-border, #e2e8f0)', color: 'var(--doctor-text-secondary, #475569)', padding: '0.125rem 0.5rem', fontSize: '0.75rem' }}>
                                      {item.duration}
                                    </span>
                                  )}
                                </div>
                                {item.notes && (
                                  <p className="mb-0 mt-1 small d-flex align-items-center gap-1" style={{ color: 'var(--doctor-text-muted, #64748b)', fontSize: '0.75rem' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '0.75rem' }}>notes</span>
                                    {item.notes}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-100 rounded-4 d-flex align-items-center justify-content-center" style={{ background: 'var(--doctor-surface-muted, #f8fafc)', border: '1px solid var(--doctor-border, #e2e8f0)', minHeight: '320px' }}>
                <div className="text-center py-4 px-3">
                  <div className="d-flex align-items-center justify-content-center rounded-circle mx-auto mb-3" style={{ width: '4rem', height: '4rem', background: 'var(--doctor-primary-soft, #eaf2ff)', color: 'var(--doctor-primary, #0052cc)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1.75rem' }}>file_present</span>
                  </div>
                  <h6 className="fw-bold mb-1" style={{ color: 'var(--doctor-text, #0f172a)' }}>Select a prescription</h6>
                  <p className="small mb-0 mx-auto" style={{ color: 'var(--doctor-text-muted, #64748b)', maxWidth: '260px', lineHeight: '1.5' }}>
                    Choose a prescription from the list to view full details and medications.
                  </p>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Print Modal */}
      <PrintPrescriptionModal
        show={showPrintModal}
        onHide={() => setShowPrintModal(false)}
        prescription={selected}
        patientProfile={patientProfile}
      />
    </div>
  );
}
