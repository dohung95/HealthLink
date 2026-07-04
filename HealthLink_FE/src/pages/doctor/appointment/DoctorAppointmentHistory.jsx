import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { doctorService } from '@api/doctorApi';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import AppointmentCard from '@components/doctor/AppointmentCard';
import { DoctorSkeletonList } from '@components/doctor/DoctorSkeleton';
import DoctorEmptyState from '@components/doctor/DoctorEmptyState';
import DoctorErrorState from '@components/doctor/DoctorErrorState';
import {
  getPatientName,
  getVisitReason,
  getStatusKey,
  parseAppointmentDate,
} from '@utils/doctor/appointmentHelpers';

const PAGE_SIZE = 15;

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function DoctorAppointmentHistory() {
  const navigate = useNavigate();
  const { doctorId } = useOutletContext();
  const [allAppointments, setAllAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!doctorId) return;
    let mounted = true;
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await doctorService.getDoctorAppointments(doctorId);
        if (mounted) setAllAppointments(data || []);
      } catch (err) {
        console.error('Error fetching appointment history:', err);
        if (mounted) setError('Failed to load appointment history');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchAll();
    return () => { mounted = false; };
  }, [doctorId]);

  const filteredAppointments = useMemo(() => {
    let list = [...allAppointments];

    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      list = list.filter((a) => {
        const d = parseAppointmentDate(a);
        return d && d >= from;
      });
    }

    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      list = list.filter((a) => {
        const d = parseAppointmentDate(a);
        return d && d <= to;
      });
    }

    if (statusFilter === 'COMPLETED') {
      list = list.filter((a) => getStatusKey(a) === 'completed');
    } else if (statusFilter === 'CANCELLED') {
      list = list.filter((a) => getStatusKey(a) === 'cancelled');
    }

    const query = searchTerm.trim().toLowerCase();
    if (query) {
      list = list.filter((appt) => {
        const haystack = [getPatientName(appt), getVisitReason(appt)]
          .filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(query);
      });
    }

    list.sort((a, b) => {
      const aTime = parseAppointmentDate(a)?.getTime() || 0;
      const bTime = parseAppointmentDate(b)?.getTime() || 0;
      return bTime - aTime;
    });

    return list;
  }, [allAppointments, dateFrom, dateTo, statusFilter, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredAppointments.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredAppointments.slice(start, start + PAGE_SIZE);
  }, [filteredAppointments, safePage]);

  const handleView = useCallback((appt) => {
    navigate(`/doctor/appointments/${appt.appointmentID || appt.appointmentId}`);
  }, [navigate]);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [dateFrom, dateTo, statusFilter, searchTerm]);

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pages = [];
    const startPage = Math.max(1, safePage - 2);
    const endPage = Math.min(totalPages, safePage + 2);
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return (
      <div className="d-flex align-items-center justify-content-center gap-2 mt-3">
        <button className="btn btn-sm btn-outline-secondary" disabled={safePage <= 1} onClick={() => handlePageChange(safePage - 1)} type="button">Prev</button>
        {startPage > 1 && <span className="small text-muted">…</span>}
        {pages.map((p) => (
          <button key={p} className={`btn btn-sm ${p === safePage ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => handlePageChange(p)} type="button">{p}</button>
        ))}
        {endPage < totalPages && <span className="small text-muted">…</span>}
        <button className="btn btn-sm btn-outline-secondary" disabled={safePage >= totalPages} onClick={() => handlePageChange(safePage + 1)} type="button">Next</button>
      </div>
    );
  };

  return (
    <div className="doctor-content-section">
      <div className="d-flex flex-column gap-3" style={{maxWidth:'48rem'}}>
        <div className="d-flex gap-1 bg-surface-container-lowest border border-surface-border rounded-4 p-1 align-self-start">
          <button className="btn btn-sm px-3 py-1 btn-outline-secondary" onClick={() => navigate('/doctor')} type="button">Today</button>
          <button className="btn btn-sm px-3 py-1 btn-primary" type="button">History</button>
        </div>

        <h5 className="fw-bold mb-0">Appointment History</h5>
        <p className="small text-muted mb-0">{filteredAppointments.length} appointment{filteredAppointments.length !== 1 ? 's' : ''} found</p>

        <div className="d-flex flex-wrap align-items-center gap-2 bg-surface-container-lowest border border-surface-border rounded-4 p-2">
          <div className="d-flex align-items-center gap-1">
            <span className="material-symbols-outlined text-muted" style={{fontSize:'1rem'}}>calendar_today</span>
            <DatePicker
              selected={dateFrom}
              onChange={(d) => setDateFrom(d)}
              placeholderText="From"
              className="form-control form-control-sm"
              dateFormat="MM/dd/yyyy"
              isClearable
              maxDate={dateTo || new Date()}
            />
          </div>
          <div className="d-flex align-items-center gap-1">
            <span className="material-symbols-outlined text-muted" style={{fontSize:'1rem'}}>calendar_today</span>
            <DatePicker
              selected={dateTo}
              onChange={(d) => setDateTo(d)}
              placeholderText="To"
              className="form-control form-control-sm"
              dateFormat="MM/dd/yyyy"
              isClearable
              minDate={dateFrom || undefined}
              maxDate={new Date()}
            />
          </div>
          <select className="form-select form-select-sm" style={{width:'auto'}} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div className="position-relative flex-grow-1" style={{minWidth:'8rem',maxWidth:'14rem'}}>
            <span className="material-symbols-outlined position-absolute top-50 start-0 translate-middle-y text-text-muted" style={{left:'0.5rem',fontSize:'0.875rem'}}>search</span>
            <input
              className="form-control form-control-sm ps-4"
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search patient..."
              type="text"
              value={searchTerm}
              style={{height:'2rem',borderRadius:'0.5rem',fontSize:'0.8125rem',borderColor:'var(--border)'}}
            />
          </div>
        </div>

        {loading ? (
          <DoctorSkeletonList rows={4} />
        ) : error ? (
          <DoctorErrorState message={error} />
        ) : pageItems.length === 0 ? (
          <DoctorEmptyState icon="calendar_month" title="No appointments found" description="Try adjusting your filters or date range." />
        ) : (
          <div className="d-flex flex-column" style={{gap:'0.625rem'}}>
            {pageItems.map((appt) => (
              <AppointmentCard
                key={appt.appointmentID || appt.appointmentId}
                appointment={appt}
                onView={handleView}
              />
            ))}
          </div>
        )}

        {renderPagination()}
      </div>
    </div>
  );
}
