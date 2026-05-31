import React, { useEffect, useMemo, useRef, useState } from 'react';
import { doctorService } from '@api/doctorApi';
import '@components/Css/doctor/doctor-dashboard/doctor-dashboard.css';
import PatientCard from '@components/doctor/PatientCard';
import { DoctorSkeletonCard } from '@components/doctor/DoctorSkeleton';
import DoctorEmptyState from '@components/doctor/DoctorEmptyState';
import DoctorErrorState from '@components/doctor/DoctorErrorState';

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'recent', label: 'Recent' },
];

export default function DoctorPatientsView() {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, totalCount: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const searchTimer = useRef(null);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
    }, 250);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search, status]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await doctorService.getMyDoctorPatients({
          search,
          status,
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
        setError('Failed to load patients');
        setPatients([]);
        setPagination({ totalPages: 1, totalCount: 0 });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [page, search, status]);

  const emptyMessage = useMemo(() => {
    if (search) return 'No patients matched this search.';
    if (status !== 'all') return `No ${status} patients found.`;
    return 'No patients have appointments with you yet.';
  }, [search, status]);

  const handleRetry = () => {
    setError(null);
    setPage(1);
  };

  return (
    <div className="d-flex flex-column" style={{ gap: '1.25rem' }}>
      <div className="patients-toolbar">
        <div className="patients-search">
          <span className="material-symbols-outlined patients-search__icon">search</span>
          <input
            aria-label="Search patients"
            className="patients-search__input"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone..."
            value={search}
          />
        </div>
        <div className="patients-filters">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              className={`doctor-filter-chip${status === filter.key ? ' doctor-filter-chip--active' : ''}`}
              onClick={() => setStatus(filter.key)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="patients-grid">
          {Array.from({ length: 6 }, (_, i) => (
            <DoctorSkeletonCard key={i} />
          ))}
        </div>
      ) : error ? (
        <DoctorErrorState message={error} onRetry={handleRetry} />
      ) : patients.length === 0 ? (
        <DoctorEmptyState
          icon="groups"
          title="No patients found"
          description={emptyMessage}
        />
      ) : (
        <>
          <div className="patients-grid">
            {patients.map((patient, index) => (
              <div
                key={patient.patientId}
                style={{ '--stagger-index': index }}
              >
                <PatientCard patient={patient} />
              </div>
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="patients-pagination">
              <button
                type="button"
                className="patients-pagination__btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>chevron_left</span>
                Previous
              </button>
              <span className="patients-pagination__info">
                Page {page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                className="patients-pagination__btn"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              >
                Next
                <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>chevron_right</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
