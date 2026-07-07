import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { doctorService, doctorScheduleService } from '@api/doctorApi';
import NextAppointmentCard from '@components/doctor/NextAppointmentCard';
import AppointmentCard from '@components/doctor/AppointmentCard';
import TodayTimeline from '@components/doctor/TodayTimeline';
import { toast } from 'sonner';
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
  toDateInputValue,
} from '@utils/doctor/appointmentHelpers';

const POLL_INTERVAL_MS = 30000;

export default function DoctorTodayCockpit() {
  const navigate = useNavigate();
  const { doctorId, appointmentsRefreshKey: refreshKey } = useOutletContext();
  const [allAppointments, setAllAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()));
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pollTick, setPollTick] = useState(0);
  const [calendarData, setCalendarData] = useState([]);
  const knownAppointmentIdsRef = useRef(new Set());

  const isToday = useMemo(() => {
    const d = new Date(`${selectedDate}T00:00:00`);
    return isSameLocalDay(d, new Date());
  }, [selectedDate]);

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

  useEffect(() => {
    knownAppointmentIdsRef.current = new Set();
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
        // Always fetch all appointments, filter client-side
        const data = await doctorService.getDoctorDailyAppointments(doctorId, selectedDate, 'All');
        if (mounted) {
          const appointments = data.appointments || [];
          const newIds = new Set(appointments.map((a) => a.appointmentID || a.appointmentId));
          if (knownAppointmentIdsRef.current.size > 0) {
            for (const appt of appointments) {
              const id = appt.appointmentID || appt.appointmentId;
              if (!knownAppointmentIdsRef.current.has(id)) {
                toast.info(`New appointment: ${getPatientName(appt)}`);
              }
            }
          }
          knownAppointmentIdsRef.current = newIds;
          setAllAppointments(appointments);
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
  }, [doctorId, selectedDate, refreshKey, pollTick]);

  const sortedAppointments = useMemo(
    () => [...allAppointments].sort((a, b) => {
      const aTime = parseAppointmentDate(a)?.getTime() || 0;
      const bTime = parseAppointmentDate(b)?.getTime() || 0;
      return aTime - bTime;
    }),
    [allAppointments],
  );

  // Group appointments by status
  const groups = useMemo(() => {
    const now = new Date();
    const inProgress = [];
    const readyNow = [];
    const upcoming = [];
    const completed = [];
    const cancelled = [];

    for (const appt of sortedAppointments) {
      const sk = getStatusKey(appt);
      if (sk === 'inprogress') { inProgress.push(appt); continue; }
      if (sk === 'completed') { completed.push(appt); continue; }
      if (sk === 'cancelled') { cancelled.push(appt); continue; }
      const apptDate = parseAppointmentDate(appt);
      if (apptDate && apptDate <= new Date(now.getTime() + 15 * 60000)) {
        readyNow.push(appt);
      } else {
        upcoming.push(appt);
      }
    }

    return { inProgress, readyNow, upcoming, completed, cancelled };
  }, [sortedAppointments]);

  // Next appointment logic
  const nextAppointment = useMemo(() => {
    const priorityList = [...groups.inProgress, ...groups.readyNow, ...groups.upcoming];
    return priorityList.filter(isActionableAppointment)[0] || null;
  }, [groups]);

  const nextAppointmentPriority = useMemo(() => {
    if (!nextAppointment) return null;
    if (groups.inProgress.includes(nextAppointment)) return 'inprogress';
    if (groups.readyNow.includes(nextAppointment)) return 'readynow';
    if (groups.upcoming.includes(nextAppointment)) return 'upcoming';
    return null;
  }, [nextAppointment, groups]);

  // Today tab: active appointments (inProgress + readyNow + upcoming)
  const todayAppointments = useMemo(() => {
    return [...groups.inProgress, ...groups.readyNow, ...groups.upcoming];
  }, [groups]);

  // Timeline: active-only appointments
  const timelineAppointments = useMemo(
    () => sortedAppointments.filter(isActionableAppointment),
    [sortedAppointments],
  );

  // Apply search filter to today's appointments
  const displayAppointments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return todayAppointments;
    return todayAppointments.filter((appt) => {
      const haystack = [getPatientName(appt), getVisitReason(appt), appt?.consultationType, appt?.status]
        .filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [todayAppointments, searchTerm]);

  const handleView = useCallback((appt) => {
    const id = appt.appointmentID || appt.appointmentId;
    if (!isActionableAppointment(appt)) {
      navigate('/doctor/appointments/history', {
        state: { selectedAppointmentId: id },
      });
      return;
    }
    navigate(`/doctor/appointments/${id}`);
  }, [navigate]);

  const handleViewPatient = useCallback((patientId) => {
    navigate(`/doctor/patients/${patientId}`);
  }, [navigate]);

  return (
    <div className="doctor-content-section">
      <div className="doctor-asymmetric-grid">
        <div className="d-flex flex-column gap-4">
          <NextAppointmentCard
            appointment={nextAppointment}
            priority={nextAppointmentPriority}
            onView={handleView}
            onViewPatient={handleViewPatient}
          />

          {/* Search bar — left aligned */}
          <div className="doctor-search">
            <span className="material-symbols-outlined doctor-search__icon">search</span>
            <input
              className="doctor-search__input"
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search patient..."
              type="text"
              value={searchTerm}
            />
          </div>

          {/* Appointment list */}
          {loading ? (
            <div style={{minHeight:'180px'}}><DoctorSkeletonList rows={4} /></div>
          ) : error ? (
            <div style={{minHeight:'180px'}}><DoctorErrorState message={error} /></div>
          ) : displayAppointments.length === 0 ? (
            <div style={{minHeight:'180px'}}>
              <DoctorEmptyState
                icon="calendar_today"
                title="No active appointments"
                description="All appointments for today are completed."
              />
            </div>
          ) : (
            <div className="d-flex flex-column" style={{gap:'0.625rem',minHeight:'180px'}}>
              {displayAppointments.map((appt) => (
                <AppointmentCard
                  key={appt.appointmentID || appt.appointmentId}
                  appointment={appt}
                  onView={handleView}
                />
              ))}
            </div>
          )}
        </div>

        <aside className="doctor-asymmetric-grid__divider">
          <TodayTimeline key={selectedDate.substring(0, 7)} appointments={timelineAppointments} calendarData={calendarData} loading={loading} selectedDate={selectedDate} onView={handleView} onDateChange={setSelectedDate} />
        </aside>
      </div>
    </div>
  );
}
