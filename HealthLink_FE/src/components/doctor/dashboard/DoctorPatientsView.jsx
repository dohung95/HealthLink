import React, { useEffect, useMemo, useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import { doctorService } from '../../../api/doctorApi';

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'recent', label: 'Recent' },
];

const formatDateTime = (value) => {
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

export default function DoctorPatientsView({ onViewPatient }) {
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
    <div className="doctor-management-view">
      <div className="doctor-management-toolbar">
        <div>
          <p className="doctor-detail-eyebrow mb-1">Patient panel</p>
          <h3 className="doctor-management-title">Patients</h3>
        </div>
        <div className="doctor-management-controls">
          <div className="doctor-management-search">
            <i className="bi bi-search"></i>
            <Form.Control
              aria-label="Search patients"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email, phone..."
              value={search}
            />
          </div>
        </div>
      </div>

      <div className="doctor-daily-status-tabs">
        {STATUS_FILTERS.map((filter) => (
          <button
            className={`doctor-daily-status-tab ${status === filter.key ? 'doctor-daily-status-tab--active' : ''}`}
            key={filter.key}
            onClick={() => setStatus(filter.key)}
            type="button"
          >
            <span>{filter.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : error ? (
        <div className="alert alert-danger m-4">{error}</div>
      ) : patients.length === 0 ? (
        <div className="doctor-detail-empty">
          <div className="doctor-detail-empty__icon">
            <i className="bi bi-people"></i>
          </div>
          <h3 className="doctor-detail-empty__title">No patients found</h3>
          <p className="doctor-detail-empty__description">{emptyMessage}</p>
        </div>
      ) : (
        <>
          <div className="doctor-patient-grid">
            {patients.map((patient) => (
              <article className="doctor-patient-card" key={patient.patientId}>
                <div className="doctor-patient-card__top">
                  <div className="doctor-patient-avatar">
                    {patient.avatarUrl ? (
                      <img alt="" src={patient.avatarUrl} />
                    ) : (
                      <span>{(patient.fullName || 'P').charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <span className="doctor-patient-status">{getRelationshipStatus(patient)}</span>
                </div>

                <h4>{patient.fullName}</h4>
                <p className="doctor-patient-card__meta">{patient.email || patient.phoneNumber || 'No contact listed'}</p>

                <div className="doctor-patient-stats">
                  <div>
                    <span>Total</span>
                    <strong>{patient.totalAppointments}</strong>
                  </div>
                  <div>
                    <span>Completed</span>
                    <strong>{patient.completedAppointments}</strong>
                  </div>
                </div>

                <div className="doctor-patient-card__timeline">
                  <p><span>Next</span>{formatDateTime(patient.nextAppointmentTime)}</p>
                  <p><span>Last</span>{formatDateTime(patient.lastAppointmentTime)}</p>
                </div>

                <Button
                  className="w-100"
                  onClick={() => onViewPatient?.(patient)}
                  type="button"
                  variant="outline-primary"
                >
                  View Patient
                </Button>
              </article>
            ))}
          </div>

          {pagination.totalPages > 1 ? (
            <div className="doctor-management-pagination">
              <Button
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                size="sm"
                variant="outline-primary"
              >
                Previous
              </Button>
              <span>Page {page} of {pagination.totalPages}</span>
              <Button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
                size="sm"
                variant="outline-primary"
              >
                Next
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
