import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { doctorService, doctorScheduleService } from '@api/doctorApi';
import NextAppointmentCard from '@components/doctor/NextAppointmentCard';
import AppointmentCard from '@components/doctor/AppointmentCard';
import TodayTimeline from '@components/doctor/TodayTimeline';
import TodayCockpitSection from '@components/doctor/TodayCockpitSection';
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
  { key: 'SCHEDULED', label: 'Scheduled', countKey: 'scheduled' },
  { key: 'IN_CONSULTATION', label: 'In Progress', countKey: 'inprogress' },
  { key: 'COMPLETED', label: 'Completed', countKey: 'completed' },
  { key: 'CANCELLED', label: 'Cancelled', countKey: 'cancelled' },
];

const POLL_INTERVAL_MS = 30000;

export default function DoctorTodayCockpit() {
  const navigate = useNavigate();
  const { doctorId, appointmentsRefreshKey: refreshKey } = useOutletContext();
  const [allAppointments, setAllAppointments] = useState([]);
  const [counts, setCounts] = useState({ scheduled: 0, completed: 0, cancelled: 0, inprogress: 0 });
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()));
  const [selectedStatus, setSelectedStatus] = useState('SCHEDULED');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pollTick, setPollTick] = useState(0);
  const [calendarData, setCalendarData] = useState([]);

  const getMonthRange = useCallback((dateStr) => {
    const d = new Date(`${dateStr}T00:00:00`);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { start: toDateInputValue(start), end: toDateInputValue(end) };
  }, []);

  useEffect(() => {
    if (!doctorId || !selectedDate) return;
    let mounted = true;
    const { start, end } = getMonthRange(selectedDate);
    doctorScheduleService.getCalendarView(start, end)
      .then((data) => { if (mounted) setCalendarData(data || []); })
      .catch(() => { if (mounted) setCalendarData([]); });
    return () => { mounted = false; };
  }, [doctorId, selectedDate, getMonthRange]);

  const isToday = useMemo(() => {
    const d = new Date(`${selectedDate}T00:00:00`);
    return isSameLocalDay(d, new Date());
  }, [selectedDate]);

  useEffect(() => {
    if (!isToday) return;
    const timer = setInterval(() => setPollTick((t) => t + 1), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isToday]);

  useEffect(() => {
    if (!doctorId || !selectedDate) return;
    let mounted = true;
    const fetchAppointments = async () => {
      setLoading(true);
      setError(null);
      try {
        const statusParam = isToday ? 'All' : selectedStatus;
        const data = await doctorService.getDoctorDailyAppointments(doctorId, selectedDate, statusParam);
        if (mounted) {
          setAllAppointments(data.appointments || []);
          setCounts(data.counts || {});
        }
      } catch (err) {
        console.error('Error fetching daily appointments:', err);
        if (mounted) {
          setError('Failed to load appointments');
          setAllAppointments([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchAppointments();
    return () => { mounted = false; };
  }, [doctorId, selectedDate, selectedStatus, refreshKey, pollTick, isToday]);

  const sortedAppointments = useMemo(
    () => [...allAppointments].sort((a, b) => {
      const aTime = parseAppointmentDate(a)?.getTime() || 0;
      const bTime = parseAppointmentDate(b)?.getTime() || 0;
      return aTime - bTime;
    }),
    [allAppointments],
  );

  const groups = useMemo(() => {
    const now = new Date();
    const inProgress = [];
    const readyNow = [];
    const upcoming = [];
    const completed = [];

    for (const appt of sortedAppointments) {
      const sk = getStatusKey(appt);
      if (sk === 'inprogress') { inProgress.push(appt); continue; }
      if (sk === 'completed') { completed.push(appt); continue; }
      if (sk === 'cancelled') continue;
      const apptDate = parseAppointmentDate(appt);
      if (apptDate && apptDate <= new Date(now.getTime() + 15 * 60000)) {
        readyNow.push(appt);
      } else {
        upcoming.push(appt);
      }
    }

    return { inProgress, readyNow, upcoming, completed };
  }, [sortedAppointments]);

  const nextAppointment = useMemo(() => {
    const all = [...groups.inProgress, ...groups.readyNow, ...groups.upcoming];
    return all.filter(isActionableAppointment)[0] || null;
  }, [groups]);

  const filteredAppointments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const source = isToday ? [...groups.readyNow, ...groups.upcoming] : sortedAppointments;
    if (!query) return source;
    return source.filter((appt) => {
      const haystack = [getPatientName(appt), getVisitReason(appt), appt?.consultationType, appt?.status]
        .filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [searchTerm, groups, isToday, sortedAppointments]);

  const displayAppointments = useMemo(() => {
    if (!isToday) return filteredAppointments;
    switch (selectedStatus) {
      case 'IN_CONSULTATION': return groups.inProgress;
      case 'COMPLETED': return groups.completed;
      case 'CANCELLED': return sortedAppointments.filter((a) => getStatusKey(a) === 'cancelled');
      default: return filteredAppointments;
    }
  }, [isToday, selectedStatus, groups, filteredAppointments, sortedAppointments]);

  const handleView = useCallback((appt) => {
    navigate(`/doctor/appointments/${appt.appointmentID || appt.appointmentId}`);
  }, [navigate]);

  return (
    <div className="doctor-content-section">
      <div className="doctor-asymmetric-grid">
        <div className="d-flex flex-column gap-4">
          <NextAppointmentCard appointment={nextAppointment} onView={handleView} selectedDate={selectedDate} />

          {isToday && groups.inProgress.length > 0 && (
            <TodayCockpitSection
              title="In Progress"
              icon="play_circle"
              appointments={groups.inProgress}
              onView={handleView}
              emptyMessage="No active consultations"
              renderItem={(appt) => <AppointmentCard appointment={appt} onView={handleView} />}
            />
          )}

          {isToday && groups.readyNow.length > 0 && (
            <TodayCockpitSection
              title="Ready Now"
              icon="timer"
              appointments={groups.readyNow}
              onView={handleView}
              emptyMessage="No patients waiting"
              renderItem={(appt) => <AppointmentCard appointment={appt} onView={handleView} />}
            />
          )}

          <div className="d-flex flex-column gap-3">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 bg-surface-container-lowest border border-surface-border rounded-4 p-2">
              <div className="doctor-filter-chips">
                {STATUS_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    className={`doctor-filter-chip ${selectedStatus === f.key ? 'doctor-filter-chip--active' : ''}`}
                    onClick={() => setSelectedStatus(f.key)}
                    type="button"
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="position-relative w-100" style={{maxWidth:'13rem'}}>
                <span className="material-symbols-outlined position-absolute top-50 start-0 translate-middle-y text-text-muted" style={{left:'0.625rem',fontSize:'0.875rem'}}>search</span>
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
              <div style={{minHeight:'180px'}}><DoctorSkeletonList rows={4} /></div>
            ) : error ? (
              <div style={{minHeight:'180px'}}><DoctorErrorState message={error} /></div>
            ) : displayAppointments.length === 0 ? (
              <div style={{minHeight:'180px'}}>
                <DoctorEmptyState icon="calendar_today" title="No appointments" description="No appointments match the current filter." />
              </div>
            ) : (
              <div className="d-flex flex-column" style={{gap:'0.625rem',minHeight:'180px'}}>
                {displayAppointments.map((appt) => (
                  <AppointmentCard key={appt.appointmentID || appt.appointmentId} appointment={appt} onView={handleView} />
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="doctor-asymmetric-grid__divider">
          <TodayTimeline appointments={sortedAppointments} calendarData={calendarData} loading={loading} selectedDate={selectedDate} onView={handleView} onDateChange={setSelectedDate} />
        </aside>
      </div>
    </div>
  );
}
