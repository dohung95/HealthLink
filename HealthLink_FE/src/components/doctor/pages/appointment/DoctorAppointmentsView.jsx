import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doctorService } from '../../../../api/doctorApi';
import '../../Css/DoctorDashboard.css';
import NextAppointmentCard from './components/NextAppointmentCard';
import AppointmentCard from './components/AppointmentCard';
import TodayTimeline from './components/TodayTimeline';
import {
  isSameLocalDay,
  isActionableAppointment,
  getPatientName,
  getVisitReason,
  getStatusKey,
  parseAppointmentDate,
  formatDateLabel,
  toDateInputValue,
} from './components/appointmentHelpers';

const STATUS_FILTERS = [
  { key: 'All', label: 'All', countKey: 'all' },
  { key: 'Scheduled', label: 'Scheduled', countKey: 'scheduled' },
  { key: 'Completed', label: 'Completed', countKey: 'completed' },
  { key: 'Cancelled', label: 'Cancelled', countKey: 'cancelled' },
];

export default function DoctorAppointmentsView({ doctorId, onViewAppointment, refreshKey }) {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [counts, setCounts] = useState({
    all: 0,
    scheduled: 0,
    completed: 0,
    cancelled: 0,
  });
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()));
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!doctorId || !selectedDate) return;

    let mounted = true;
    const fetchAppointments = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await doctorService.getDoctorDailyAppointments(
          doctorId,
          selectedDate,
          selectedStatus,
        );
        if (mounted) {
          setAppointments(data.appointments || []);
          setCounts(data.counts || {});
        }
      } catch (err) {
        console.error('Error fetching daily appointments:', err);
        if (mounted) {
          setError('Failed to load appointments');
          setAppointments([]);
          setCounts({
            all: 0,
            scheduled: 0,
            completed: 0,
            cancelled: 0,
          });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchAppointments();
    return () => {
      mounted = false;
    };
  }, [doctorId, selectedDate, selectedStatus, refreshKey]);

  const selectedDateLabel = useMemo(() => formatDateLabel(selectedDate), [selectedDate]);

  const sortedAppointments = useMemo(
    () =>
      [...appointments].sort((left, right) => {
        const leftTime = parseAppointmentDate(left)?.getTime() || 0;
        const rightTime = parseAppointmentDate(right)?.getTime() || 0;
        return leftTime - rightTime;
      }),
    [appointments],
  );

  const filteredAppointments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return sortedAppointments;

    return sortedAppointments.filter((appointment) => {
      const haystack = [
        getPatientName(appointment),
        getVisitReason(appointment),
        appointment?.consultationType,
        appointment?.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [searchTerm, sortedAppointments]);

  const nextAppointment = useMemo(() => {
    const now = new Date();
    const selected = new Date(`${selectedDate}T00:00:00`);
    const sameDay = !Number.isNaN(selected.getTime()) && isSameLocalDay(selected, now);
    const candidates = sortedAppointments.filter(isActionableAppointment);
    if (!candidates.length) return null;

    const inProgress = candidates.find((appointment) => getStatusKey(appointment) === 'inprogress');
    if (inProgress) return inProgress;

    if (sameDay) {
      return candidates.find((appointment) => {
        const appointmentDate = parseAppointmentDate(appointment);
        return appointmentDate && appointmentDate >= now;
      }) || candidates[0];
    }

    return candidates[0];
  }, [selectedDate, sortedAppointments]);

  const handleView = (appointment) => {
    if (onViewAppointment) {
      onViewAppointment(appointment);
      return;
    }
    navigate(`/appointment/${appointment.appointmentID || appointment.appointmentId}`);
  };

  return (
    <div className="doctor-content-section pt-4">
      <div className="doctor-stat-row mb-3">
        <div className="doctor-stat-card doctor-stat-card--primary">
          <span className="doctor-stat-card__value">{counts.scheduled || 0}</span>
          <span className="doctor-stat-card__label">Scheduled</span>
        </div>
        <div className="doctor-stat-card doctor-stat-card--success">
          <span className="doctor-stat-card__value">{counts.completed || 0}</span>
          <span className="doctor-stat-card__label">Completed</span>
        </div>
        <div className="doctor-stat-card doctor-stat-card--warning">
          <span className="doctor-stat-card__value">{counts.cancelled || 0}</span>
          <span className="doctor-stat-card__label">Cancelled</span>
        </div>
        <div className="doctor-stat-card">
          <span className="doctor-stat-card__value">{selectedDateLabel.split(',')[0]}</span>
          <span className="doctor-stat-card__label">Selected Date</span>
        </div>
      </div>

      <div className="row g-4 align-items-start">
        <div className="col-lg-8 d-flex flex-column gap-4">
          <NextAppointmentCard appointment={nextAppointment} onView={handleView} selectedDate={selectedDate} />

          <div className="d-flex flex-column gap-3">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 bg-surface-container-lowest border border-surface-border rounded-4 p-2">
              <div className="doctor-filter-chips">
                {STATUS_FILTERS.map((filter) => {
                  const isActive = selectedStatus === filter.key;
                  return (
                    <button
                      className={`doctor-filter-chip ${isActive ? 'doctor-filter-chip--active' : ''}`}
                      key={filter.key}
                      onClick={() => setSelectedStatus(filter.key)}
                      type="button"
                    >
                      {filter.label}
                      {counts[filter.countKey] > 0 && (
                        <span className="doctor-filter-chip__count">{counts[filter.countKey]}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="position-relative w-100" style={{maxWidth:'13rem'}}>
                <span className="material-symbols-outlined position-absolute top-50 start-0 translate-middle-y text-text-muted" style={{left:'0.625rem',fontSize:'0.875rem'}}>search</span>
                <input
                  className="form-control form-control-sm ps-4"
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search patient..."
                  type="text"
                  value={searchTerm}
                  style={{height:'2rem',borderRadius:'0.5rem',fontSize:'0.8125rem',borderColor:'var(--border)'}}
                />
              </div>
            </div>

            {loading ? (
              <div className="doctor-empty-state">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : error ? (
              <div className="alert alert-danger py-2 mb-0" role="alert" style={{fontSize:'0.8125rem'}}>{error}</div>
            ) : filteredAppointments.length === 0 ? (
              <div className="doctor-empty-state">
                <div className="doctor-empty-state__icon">
                  <span className="material-symbols-outlined">calendar_today</span>
                </div>
                <h3 className="doctor-empty-state__title">No appointments for this day</h3>
                <p className="doctor-empty-state__desc">Choose another date or status to review the schedule.</p>
              </div>
            ) : (
              <div className="d-flex flex-column" style={{gap:'0.625rem'}}>
                {filteredAppointments.map((appointment) => (
                  <AppointmentCard appointment={appointment} key={appointment.appointmentID || appointment.appointmentId} onView={handleView} />
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="col-lg-4">
          <TodayTimeline appointments={sortedAppointments} loading={loading} selectedDate={selectedDate} onView={handleView} onDateChange={setSelectedDate} />
        </aside>
      </div>
    </div>
  );
}
