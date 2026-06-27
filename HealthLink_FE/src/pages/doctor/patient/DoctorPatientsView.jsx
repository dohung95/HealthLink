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
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, totalCount: 0 });
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState(null);
  const [listRetryKey, setListRetryKey] = useState(0);

  // Detail state
  const [selectedPatientId, setSelectedPatientId] = useState(() => patientId || null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [history, setHistory] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  // Mobile state
  const [mobileDetailOpen, setMobileDetailOpen] = useState(!!patientId);

  const searchTimer = useRef(null);

  // Sync selectedPatientId from URL param
  useEffect(() => {
    if (patientId) {
      setSelectedPatientId(patientId);
      setMobileDetailOpen(true);
    }
  }, [patientId]);

  // Debounce search input, reset page on change
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
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
  }, [page, debouncedSearch, statusFilter, listRetryKey]);

  // Handle patient selection
  const handleSelectPatient = useCallback((id) => {
    setSelectedPatientId(id);
    navigate(`/doctor/patients/${id}`, { replace: true });
    setMobileDetailOpen(true);
  }, [navigate]);

  // Auto-select first patient when list loads and nothing is selected
  useEffect(() => {
    if (patients.length > 0 && !selectedPatientId) {
      handleSelectPatient(patients[0].patientId);
    }
  }, [patients, selectedPatientId]);

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
    setSelectedPatientId(null);
    navigate('/doctor/patients', { replace: true });
  }, [navigate]);

  const emptyMessage = useMemo(() => {
    if (search) return 'No patients matched this search.';
    if (statusFilter !== 'all') return `No ${statusFilter} patients found.`;
    return 'No patients have appointments with you yet.';
  }, [search, statusFilter]);

  const handleRetry = () => {
    setListError(null);
    setListRetryKey((k) => k + 1);
  };

  // Render list panel
  const renderList = () => (
    <div className={`split-patients-list${mobileDetailOpen ? ' split-patients-list--hidden' : ''}`}>
      <div className="split-patients__toolbar">
        <div className="split-patients__toolbar-header">
          <span className="split-patients__toolbar-title">Patients</span>
          {!listLoading && pagination.totalCount > 0 && (
            <span className="split-patients__toolbar-count">{pagination.totalCount}</span>
          )}
        </div>
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
              aria-label={`Filter by ${filter.label}`}
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
          patients.map((patient, index) => (
            <PatientCompactRow
              key={patient.patientId}
              patient={patient}
              isActive={String(selectedPatient?.patientId) === String(patient.patientId)}
              onSelect={handleSelectPatient}
              style={{ '--stagger-index': index }}
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
    if (!selectedPatient && !detailLoading) {
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
        <div className="split-patients__detail-skeleton">
          <div className="skeleton-hero">
            <div className="skeleton-hero__avatar" />
            <div className="skeleton-hero__lines">
              <div className="skeleton-hero__line" style={{ width: '55%' }} />
              <div className="skeleton-hero__line" style={{ width: '35%' }} />
            </div>
          </div>
          <div className="skeleton-stats" />
          <div className="skeleton-tabs" />
          <div className="skeleton-grid">
            <div className="skeleton-grid__item" />
            <div className="skeleton-grid__item" />
            <div className="skeleton-grid__item" />
            <div className="skeleton-grid__item" />
          </div>
        </div>
      );
    }

    if (detailError) {
      return (
        <div className="d-flex align-items-center justify-content-center" style={{ height: '100%', padding: '2rem' }}>
          <DoctorErrorState message={detailError} onRetry={() => handleSelectPatient(selectedPatientId)} />
        </div>
      );
    }

    return (
      <>
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
