import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doctorService } from '@api/doctorApi';
import '@components/Css/doctor/doctor-dashboard/doctor-dashboard.css';
import { DoctorSkeletonCard } from '@components/doctor/DoctorSkeleton';
import DoctorEmptyState from '@components/doctor/DoctorEmptyState';
import DoctorErrorState from '@components/doctor/DoctorErrorState';

const STATUS_FILTER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'recent', label: 'Recent' },
];

const formatShortDateTime = (value) => {
  if (!value) return 'None';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'None';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getRelationshipStatus = (patient) => {
  if (patient.nextAppointmentTime) return 'Upcoming';
  if (patient.lastAppointmentTime) return 'Recent';
  return 'Inactive';
};

export default function DoctorPatientsView() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, totalCount: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, status]);

  useEffect(() => {
    let mounted = true;

    const loadPatients = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await doctorService.getMyDoctorPatients({
          search,
          status,
          page,
          pageSize: 12,
        });

        if (mounted) {
          setPatients(data.patients || []);
          setPagination({
            totalPages: data.totalPages || 1,
            totalCount: data.totalCount || 0,
          });
        }
      } catch (err) {
        console.error('Error loading doctor patients:', err);
        if (mounted) {
          setError('Failed to load patients');
          setPatients([]);
          setPagination({ totalPages: 1, totalCount: 0 });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadPatients();
    return () => {
      mounted = false;
    };
  }, [page, search, status]);

  const emptyMessage = useMemo(() => {
    if (search) return 'No patients matched this search.';
    if (status !== 'all') return `No ${status} patients found.`;
    return 'No patients have appointments with you yet.';
  }, [search, status]);

  return (
    <div className="d-flex flex-column" style={{ gap: '1rem' }}>
      {/* Toolbar */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
        <div>
          <p className="mb-1 text-uppercase" style={{ fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.08em', color: 'var(--text-light-secondary)' }}>Patient panel</p>
          <h3 style={{ color: '#111827', fontSize: '1.15rem', fontWeight: '700', margin: 0 }}>Patients</h3>
        </div>
        <div className="position-relative d-flex align-items-center" style={{ minWidth: '220px' }}>
          <i className="bi bi-search position-absolute" style={{ left: '0.85rem', color: '#64748b', pointerEvents: 'none' }}></i>
          <input
            aria-label="Search patients"
            className="form-control"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email, phone..."
            value={search}
            style={{ paddingLeft: '2.4rem', border: '1px solid var(--border-light)', borderRadius: '0.5rem', fontSize: '0.875rem' }}
          />
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="d-flex align-items-center gap-2">
        {STATUS_FILTER_OPTIONS.map((filter) => (
          <button
            key={filter.key}
            onClick={() => setStatus(filter.key)}
            type="button"
            className="btn btn-sm"
            style={{
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.35rem 0.85rem',
              fontSize: '0.8rem',
              fontWeight: status === filter.key ? '600' : '500',
              color: status === filter.key ? '#ffffff' : '#64748b',
              background: status === filter.key ? 'var(--accent, #1564e8)' : '#f1f5f9',
              transition: 'all 0.15s ease',
              cursor: 'pointer',
            }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="row g-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div className="col-md-6 col-lg-4" key={i}>
              <DoctorSkeletonCard />
            </div>
          ))}
        </div>
      ) : error ? (
        <DoctorErrorState message={error} />
      ) : patients.length === 0 ? (
        <DoctorEmptyState
          icon="groups"
          title="No patients found"
          description={emptyMessage}
        />
      ) : (
        <>
          <div className="row g-3">
            {patients.map((patient, index) => (
              <article className="col-md-6 col-lg-4 doctor-stagger-item" key={patient.patientId} style={{ '--stagger-index': index }}>
                <div
                  className="d-flex flex-column p-3 rounded-3 border border-surface-border bg-white transition-base"
                  style={{ gap: '0.75rem', height: '100%' }}
                >
                  <div className="d-flex align-items-center justify-content-between">
                    <div
                      className="d-flex align-items-center justify-content-center rounded-circle"
                      style={{
                        width: '2.75rem',
                        height: '2.75rem',
                        background: 'var(--surface-container, #eef2f7)',
                        fontSize: '1rem',
                        fontWeight: '700',
                        color: 'var(--text-light-secondary, #475569)',
                        overflow: 'hidden',
                      }}
                    >
                      {patient.avatarUrl ? (
                        <img alt="" src={patient.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span>{(patient.fullName || 'P').charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <span
                      className="d-inline-flex align-items-center gap-1 rounded-pill px-2 py-1"
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        background: patient.nextAppointmentTime ? 'rgba(21,100,232,0.1)' : patient.lastAppointmentTime ? 'rgba(245,158,11,0.1)' : '#f1f5f9',
                        color: patient.nextAppointmentTime ? '#1564e8' : patient.lastAppointmentTime ? '#d97706' : '#64748b',
                      }}
                    >
                      {getRelationshipStatus(patient)}
                    </span>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>{patient.fullName}</h4>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.15rem 0 0 0' }}>{patient.email || patient.phoneNumber || 'No contact listed'}</p>
                  </div>

                  <div className="d-flex gap-3">
                    <div className="d-flex flex-column align-items-center rounded-3 p-2 flex-fill" style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total</span>
                      <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{patient.totalAppointments}</strong>
                    </div>
                    <div className="d-flex flex-column align-items-center rounded-3 p-2 flex-fill" style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Completed</span>
                      <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{patient.completedAppointments}</strong>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                    <p style={{ margin: 0 }}><span style={{ fontWeight: '600', color: '#64748b' }}>Next: </span>{formatShortDateTime(patient.nextAppointmentTime)}</p>
                    <p style={{ margin: '0.15rem 0 0 0' }}><span style={{ fontWeight: '600', color: '#64748b' }}>Last: </span>{formatShortDateTime(patient.lastAppointmentTime)}</p>
                  </div>

                  <button
                    type="button"
                    className="btn w-100"
                    onClick={() => navigate(`/doctor/patients/${patient.patientId}`)}
                    style={{
                      border: '1px solid var(--border-light, #e2e8f0)',
                      borderRadius: '0.5rem',
                      fontSize: '0.825rem',
                      fontWeight: '600',
                      color: '#0f172a',
                      background: '#ffffff',
                      padding: '0.45rem 0.75rem',
                      transition: 'all 0.15s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#1564e8'; e.currentTarget.style.color = '#1564e8'; e.currentTarget.style.background = '#f5f8ff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-light, #e2e8f0)'; e.currentTarget.style.color = '#0f172a'; e.currentTarget.style.background = '#ffffff'; }}
                  >
                    View Patient
                  </button>
                </div>
              </article>
            ))}
          </div>

          {pagination.totalPages > 1 ? (
            <div className="d-flex align-items-center justify-content-center gap-3 pt-3">
              <button
                type="button"
                className="btn"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                style={{
                  border: '1px solid var(--border-light, #e2e8f0)',
                  borderRadius: '0.5rem',
                  fontSize: '0.8rem',
                  fontWeight: '500',
                  color: page <= 1 ? '#cbd5e1' : '#475569',
                  background: '#ffffff',
                  padding: '0.35rem 0.85rem',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                }}
              >
                Previous
              </button>
              <span style={{ fontSize: '0.825rem', color: '#64748b' }}>Page {page} of {pagination.totalPages}</span>
              <button
                type="button"
                className="btn"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
                style={{
                  border: '1px solid var(--border-light, #e2e8f0)',
                  borderRadius: '0.5rem',
                  fontSize: '0.8rem',
                  fontWeight: '500',
                  color: page >= pagination.totalPages ? '#cbd5e1' : '#475569',
                  background: '#ffffff',
                  padding: '0.35rem 0.85rem',
                  cursor: page >= pagination.totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                Next
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
