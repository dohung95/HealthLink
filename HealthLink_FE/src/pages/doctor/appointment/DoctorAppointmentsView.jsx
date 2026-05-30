import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { doctorService } from '@api/doctorApi';
import '@components/Css/doctor/doctor-dashboard/doctor-dashboard.css';
import NextAppointmentCard from '@components/doctor/NextAppointmentCard';
import AppointmentCard from '@components/doctor/AppointmentCard';
import TodayTimeline from '@components/doctor/TodayTimeline';
import { DoctorSkeletonList } from '@components/doctor/DoctorSkeleton';
import DoctorEmptyState from '@components/doctor/DoctorEmptyState';
import DoctorErrorState from '@components/doctor/DoctorErrorState';
import {
  isSameLocalDay,
  isActionableAppointment,
  getPatientName,
  getVisitReason,
  getStatusKey,
  parseAppointmentDate,
  formatDateLabel,
  toDateInputValue,
} from '@utils/doctor/appointmentHelpers';

const STATUS_FILTERS = [
  { key: 'All', label: 'All', countKey: 'all' },
  { key: 'SCHEDULED', label: 'Scheduled', countKey: 'scheduled' },
  { key: 'IN_CONSULTATION', label: 'In Progress', countKey: 'inprogress' },
  { key: 'COMPLETED', label: 'Completed', countKey: 'completed' },
  { key: 'CANCELLED', label: 'Cancelled', countKey: 'cancelled' },
];

export default function DoctorAppointmentsView() {
  const navigate = useNavigate();
  const { doctorId, appointmentsRefreshKey: refreshKey } = useOutletContext();
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
    navigate(`/doctor/appointments/${appointment.appointmentID || appointment.appointmentId}`);
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

      <div className="doctor-asymmetric-grid">
        <div className="d-flex flex-column gap-4">
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
              <DoctorSkeletonList rows={4} />
            ) : error ? (
              <DoctorErrorState message={error} />
            ) : filteredAppointments.length === 0 ? (
              <DoctorEmptyState
                icon="calendar_today"
                title="No appointments for this day"
                description="Choose another date or status to review the schedule."
              />
            ) : (
              <div className="d-flex flex-column" style={{gap:'0.625rem'}}>
                {filteredAppointments.map((appointment, index) => (
                  <div key={appointment.appointmentID || appointment.appointmentId} className="doctor-stagger-item" style={{ '--stagger-index': index }}>
                    <AppointmentCard appointment={appointment} onView={handleView} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="doctor-asymmetric-grid__divider">
          <TodayTimeline appointments={sortedAppointments} loading={loading} selectedDate={selectedDate} onView={handleView} onDateChange={setSelectedDate} />
        </aside>
      </div>
    </div>
  );
}
