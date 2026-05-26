import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doctorService } from '../../../api/doctorApi';
import '../Css/DoctorDashboard.css';

const STATUS_FILTERS = [
  { key: 'All', label: 'All', countKey: 'all' },
  { key: 'Scheduled', label: 'Scheduled', countKey: 'scheduled' },
  { key: 'Completed', label: 'Completed', countKey: 'completed' },
  { key: 'Cancelled', label: 'Cancelled', countKey: 'cancelled' },
];

const STATUS_TONES = {
  scheduled: {
    badge: 'bg-surface-container-highest text-text-muted',
    rail: 'bg-surface-container-highest',
    dot: 'bg-surface-container-highest',
    card: '',
  },
  completed: {
    badge: 'bg-success/10 text-success',
    rail: 'bg-success',
    dot: 'bg-success',
    card: 'opacity-75 hover:opacity-100',
  },
  cancelled: {
    badge: 'bg-critical/10 text-critical',
    rail: 'bg-critical',
    dot: 'bg-critical',
    card: 'opacity-60',
  },
  inprogress: {
    badge: 'bg-warning/10 text-warning',
    rail: 'bg-primary-container',
    dot: 'bg-warning',
    card: '',
  },
  default: {
    badge: 'bg-surface-container text-text-main',
    rail: 'bg-primary',
    dot: 'bg-primary-container',
    card: '',
  },
};

const TYPE_TONES = {
  video: 'bg-primary/10 text-primary',
  audio: 'bg-surface-container text-text-main',
  chat: 'bg-primary-fixed text-primary',
  offline: 'bg-surface-container text-text-main',
  default: 'bg-surface-container text-text-main',
};

const toDateInputValue = (date) => {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return '';

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const shiftDate = (dateValue, days) => {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
};

const parseAppointmentDate = (appointment) => {
  const value = appointment?.appointmentTime ? new Date(appointment.appointmentTime) : null;
  return value && !Number.isNaN(value.getTime()) ? value : null;
};

const formatDateLabel = (dateValue) => {
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'Selected day';
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatShortDate = (dateValue) => {
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'Today';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatTimeFromDate = (date) => {
  if (!date || Number.isNaN(date.getTime())) return 'Time TBD';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getPatientName = (appointment) =>
  appointment?.patient?.fullName || appointment?.patientName || 'Unknown Patient';

const getPatientAvatar = (appointment) =>
  appointment?.patient?.avatarUrl ||
  appointment?.patient?.profileImage ||
  appointment?.patientAvatar ||
  appointment?.avatarUrl ||
  '';

const getPatientInitials = (name) =>
  String(name || 'UP')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'UP';

const getVisitReason = (appointment) =>
  [appointment?.reason, appointment?.symptoms, appointment?.chiefComplaint]
    .find((value) => typeof value === 'string' && value.trim()) || '';

const getTypeKey = (type) => {
  const value = String(type || '').toLowerCase();
  if (value.includes('video')) return 'video';
  if (value.includes('audio') || value.includes('call')) return 'audio';
  if (value.includes('chat')) return 'chat';
  if (value.includes('offline') || value.includes('room') || value.includes('clinic')) return 'offline';
  return 'default';
};

const getTypeIcon = (type) => {
  const key = getTypeKey(type);
  if (key === 'video') return 'videocam';
  if (key === 'audio') return 'call';
  if (key === 'chat') return 'chat';
  if (key === 'offline') return 'local_hospital';
  return 'event';
};

const getDisplayStatus = (appointment) => {
  const status = String(appointment?.status || 'Scheduled');
  const normalized = status.toLowerCase().replace(/[\s_-]/g, '');
  const hasStarted = Boolean(appointment?.consultationStartTime || appointment?.hasStarted);

  if (normalized.includes('cancel')) return 'Cancelled';
  if (normalized.includes('complete')) return 'Completed';
  if (normalized.includes('progress') || (hasStarted && normalized.includes('scheduled'))) return 'In Progress';
  if (normalized.includes('scheduled')) return 'Scheduled';
  return status;
};

const getStatusKey = (appointment) => getDisplayStatus(appointment).toLowerCase().replace(/[\s_-]/g, '');

const getDurationLabel = (appointment) => {
  const start = appointment?.consultationStartTime ? new Date(appointment.consultationStartTime) : null;
  const end = appointment?.consultationEndTime ? new Date(appointment.consultationEndTime) : null;

  if (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end > start) {
    const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
    return `${minutes} min${minutes === 1 ? '' : 's'}`;
  }

  const explicitDuration = appointment?.durationMinutes || appointment?.slotDuration || appointment?.duration;
  if (explicitDuration) return `${explicitDuration} mins`;
  return '30 mins';
};

const getPatientMeta = (appointment) => {
  const patient = appointment?.patient || {};
  const parts = [];
  if (patient.patientID || appointment?.patientID || appointment?.patientId) {
    parts.push(`ID: ${patient.patientID || appointment.patientID || appointment.patientId}`);
  }
  if (patient.gender) parts.push(patient.gender);
  if (patient.age) parts.push(`${patient.age}y`);
  return parts.join(' - ');
};

const isSameLocalDay = (left, right) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const isActionableAppointment = (appointment) => {
  const statusKey = getStatusKey(appointment);
  return statusKey !== 'cancelled' && statusKey !== 'completed';
};

export default function DoctorAppointmentsView({ doctorId, onViewAppointment }) {
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
  }, [doctorId, selectedDate, selectedStatus]);

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
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <div className="flex flex-col gap-4 lg:col-span-8">
        <section className="rounded-lg border border-surface-border bg-white">
          <div className="flex flex-col gap-3 border-b border-surface-border bg-surface-bright px-4 py-3 md:flex-row md:items-center md:justify-between md:px-5">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase text-text-muted">Daily schedule</p>
              <h2 className="mb-0 text-base font-bold text-text-main md:text-lg">{selectedDateLabel}</h2>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="inline-flex rounded-lg border border-surface-border bg-surface-container-low p-1" role="group" aria-label="Change date">
                <button className="flex h-9 w-9 items-center justify-center rounded-md text-text-muted hover:bg-white hover:text-primary" onClick={() => setSelectedDate((current) => shiftDate(current, -1))} title="Previous day" type="button">
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                <button className="h-9 rounded-md px-3 text-sm font-semibold text-primary hover:bg-white" onClick={() => setSelectedDate(toDateInputValue(new Date()))} type="button">
                  Today
                </button>
                <button className="flex h-9 w-9 items-center justify-center rounded-md text-text-muted hover:bg-white hover:text-primary" onClick={() => setSelectedDate((current) => shiftDate(current, 1))} title="Next day" type="button">
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>
              <input
                aria-label="Select appointment date"
                className="h-10 rounded-lg border border-surface-border bg-surface-container-low px-3 text-sm text-text-main focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-container"
                onChange={(event) => setSelectedDate(event.target.value)}
                type="date"
                value={selectedDate}
              />
            </div>
          </div>

          <NextAppointmentCard appointment={nextAppointment} onView={handleView} selectedDate={selectedDate} />
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-3 rounded-lg border border-surface-border bg-white p-2 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-1 overflow-x-auto pb-1 md:pb-0">
              {STATUS_FILTERS.map((filter) => {
                const isActive = selectedStatus === filter.key;
                return (
                  <button
                    className={`whitespace-nowrap rounded-lg px-4 py-2 text-xs font-bold transition ${isActive ? 'bg-primary-container text-white' : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'}`}
                    key={filter.key}
                    onClick={() => setSelectedStatus(filter.key)}
                    type="button"
                  >
                    {filter.label}
                    <span className={`ml-2 rounded px-1.5 py-0.5 ${isActive ? 'bg-white/20 text-white' : 'bg-surface-container text-text-muted'}`}>
                      {counts?.[filter.countKey] ?? 0}
                    </span>
                  </button>
                );
              })}
            </div>

            <label className="relative w-full md:w-72">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-text-muted">search</span>
              <input
                className="h-10 w-full rounded-lg border border-surface-border bg-surface-container-low pl-9 pr-3 text-sm text-text-main placeholder:text-text-muted focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-container"
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search patient..."
                type="search"
                value={searchTerm}
              />
            </label>
          </div>

          {loading ? (
            <LoadingState />
          ) : error ? (
            <div className="rounded-lg border border-error-container bg-white p-5 text-error" role="alert">{error}</div>
          ) : appointments.length === 0 ? (
            <EmptyState description="Choose another date or status to review the schedule." title="No appointments for this day" />
          ) : filteredAppointments.length === 0 ? (
            <EmptyState description="Adjust the search term or clear it to return to the daily list." title="No appointments match your search" />
          ) : (
            <div className="space-y-4">
              {filteredAppointments.map((appointment) => (
                <AppointmentCard appointment={appointment} key={appointment.appointmentID || appointment.appointmentId} onView={handleView} />
              ))}
            </div>
          )}
        </section>
      </div>

      <aside className="lg:col-span-4">
        <TodayTimeline appointments={sortedAppointments} loading={loading} selectedDate={selectedDate} onView={handleView} />
      </aside>
    </div>
  );
}

const NextAppointmentCard = ({ appointment, onView, selectedDate }) => {
  if (!appointment) {
    return (
      <div className="p-4">
        <div className="rounded-lg border border-dashed border-surface-border bg-surface-container-low p-5 text-center">
          <span className="material-symbols-outlined text-2xl text-text-muted">event_available</span>
          <h3 className="mb-1 mt-2 text-base font-bold text-text-main">No upcoming appointment</h3>
          <p className="mb-0 text-sm text-text-muted">There are no scheduled appointments to highlight for {formatShortDate(selectedDate)}.</p>
        </div>
      </div>
    );
  }

  const patientName = getPatientName(appointment);
  const reason = getVisitReason(appointment);
  const patientMeta = getPatientMeta(appointment);
  const typeKey = getTypeKey(appointment.consultationType);
  const appointmentDate = parseAppointmentDate(appointment);
  const diffMinutes = appointmentDate ? Math.round((appointmentDate.getTime() - Date.now()) / 60000) : null;
  const statusKey = getStatusKey(appointment);
  const statusTone = STATUS_TONES[statusKey] || STATUS_TONES.default;

  return (
    <div className="relative overflow-hidden p-4 md:p-5">
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_40px_rgba(0,82,204,0.03)]" />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h3 className="mb-0 flex items-center gap-2 text-base font-semibold text-text-main">
          <span className="h-2 w-2 rounded-full bg-primary-container" />
          Next Appointment
        </h3>
        {diffMinutes != null && diffMinutes >= 0 ? (
          <span className="rounded-full bg-primary-fixed-dim/30 px-3 py-1 text-xs font-bold text-primary-container">
            In {diffMinutes < 60 ? `${diffMinutes} mins` : `${Math.round(diffMinutes / 60)} hrs`}
          </span>
        ) : (
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTone.badge}`}>{getDisplayStatus(appointment)}</span>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-center">
        <div className="md:border-r md:border-surface-border md:pr-5">
          <div className="mb-5 flex items-center gap-4">
            <PatientAvatar appointment={appointment} name={patientName} size="large" />
            <div className="min-w-0">
              <h3 className="mb-1 truncate text-lg font-bold text-text-main">{patientName}</h3>
              {patientMeta ? <p className="mb-0 text-sm text-text-muted">{patientMeta}</p> : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <InfoBlock label="Reason for visit" value={reason || 'Reason not provided'} />
            <InfoBlock
              icon={getTypeIcon(appointment.consultationType)}
              label="Type"
              value={appointment.consultationType || 'Consultation'}
            />
            <InfoBlock label="Time" value={formatTimeFromDate(appointmentDate)} />
            <div>
              <p className="mb-1 text-xs font-semibold uppercase text-text-muted">Status</p>
              <span className={`inline-flex rounded-md px-2 py-1 text-xs font-bold ${statusTone.badge}`}>
                {getDisplayStatus(appointment)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-container px-4 py-3 text-sm font-semibold text-white hover:brightness-110" onClick={() => onView(appointment)} type="button">
            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
            Open detail
          </button>
          <div className={`inline-flex items-center justify-center gap-1 rounded-lg px-4 py-3 text-sm font-semibold ${TYPE_TONES[typeKey] || TYPE_TONES.default}`}>
            <span className="material-symbols-outlined text-[18px]">{getTypeIcon(appointment.consultationType)}</span>
            {appointment.consultationType || 'Consultation'}
          </div>
        </div>
      </div>
    </div>
  );
};

const AppointmentCard = ({ appointment, onView }) => {
  const patientName = getPatientName(appointment);
  const reason = getVisitReason(appointment);
  const appointmentDate = parseAppointmentDate(appointment);
  const typeKey = getTypeKey(appointment.consultationType);
  const statusKey = getStatusKey(appointment);
  const statusTone = STATUS_TONES[statusKey] || STATUS_TONES.default;
  const actionLabel = statusKey === 'completed' ? 'View notes' : 'View details';

  return (
    <article className={`group relative overflow-hidden rounded-lg border border-surface-border bg-white p-4 transition hover:shadow-sm md:p-5 ${statusTone.card}`}>
      <div className={`absolute bottom-0 left-0 top-0 w-1 transition-all group-hover:w-1.5 ${statusTone.rail}`} />
      <div className="grid gap-3 md:grid-cols-[120px_minmax(0,1fr)] xl:grid-cols-[120px_minmax(0,1fr)_220px_100px] md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-text-main">{formatTimeFromDate(appointmentDate)}</span>
            <span className="text-xs font-semibold text-text-muted">{getDurationLabel(appointment)}</span>
          </div>
          <div className="hidden h-10 w-px bg-surface-border md:block" />
        </div>

        <div className="flex min-w-0 items-center gap-3">
          <PatientAvatar appointment={appointment} name={patientName} />
          <div className="min-w-0">
            <h3 className="mb-1 truncate text-sm font-semibold text-text-main">{patientName}</h3>
            <p className="mb-0 truncate text-xs font-semibold text-text-muted">{reason || 'Reason not provided'}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold ${TYPE_TONES[typeKey] || TYPE_TONES.default}`}>
            <span className="material-symbols-outlined text-[14px]">{getTypeIcon(appointment.consultationType)}</span>
            {appointment.consultationType || 'Consultation'}
          </span>
          <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold ${statusTone.badge}`}>
            {statusKey === 'inprogress' ? <span className="h-1.5 w-1.5 rounded-full bg-warning" /> : null}
            {getDisplayStatus(appointment)}
          </span>
        </div>

        <div className="flex justify-end">
          {statusKey !== 'cancelled' ? (
            <button className="rounded-lg border border-primary-container px-4 py-2 text-xs font-bold text-primary hover:bg-surface-container" onClick={() => onView(appointment)} type="button">
              {actionLabel}
            </button>
          ) : (
            <span className="text-xs font-semibold text-text-muted">No action</span>
          )}
        </div>
      </div>
    </article>
  );
};

const TodayTimeline = ({ appointments, loading, selectedDate, onView }) => (
  <section className="sticky top-16 rounded-lg border border-surface-border bg-white">
    <div className="flex items-center justify-between border-b border-surface-border bg-surface-bright px-4 py-3">
      <div>
        <h2 className="mb-0 text-base font-semibold text-text-main">Today's Schedule</h2>
        <p className="mb-0 text-xs text-text-muted">{formatShortDate(selectedDate)}</p>
      </div>
      <span className="rounded bg-surface-container px-2 py-0.5 text-xs font-bold text-text-muted">{appointments.length}</span>
    </div>

    <div className="relative max-h-[650px] overflow-y-auto p-4">
      <div className="absolute bottom-4 left-[62px] top-4 w-px bg-surface-border" />
      {loading ? (
        <div className="py-8 text-center">
          <div className="spinner-border spinner-border-sm text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : appointments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-surface-border bg-surface-container-low p-4 text-sm text-text-muted">
          No timeline items for this day.
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((appointment) => {
            const statusKey = getStatusKey(appointment);
            const statusTone = STATUS_TONES[statusKey] || STATUS_TONES.default;
            const appointmentDate = parseAppointmentDate(appointment);
            return (
              <button
                className={`relative z-10 flex w-full gap-4 text-left ${statusKey === 'completed' || statusKey === 'cancelled' ? 'opacity-70' : ''}`}
                key={`timeline-${appointment.appointmentID || appointment.appointmentId}`}
                onClick={() => statusKey !== 'cancelled' && onView(appointment)}
                type="button"
              >
                <span className={`w-12 shrink-0 pt-1 text-right text-xs font-bold ${statusKey === 'inprogress' ? 'text-primary-container' : 'text-text-muted'}`}>
                  {formatTimeFromDate(appointmentDate)}
                </span>
                <span className={`absolute left-[42px] top-1.5 h-3 w-3 rounded-full border-2 border-white ${statusTone.dot}`} />
                <span className={`flex-1 rounded-lg border p-3 transition ${statusKey === 'inprogress' ? 'border-primary-fixed-dim bg-primary-fixed-dim/10' : 'border-surface-border bg-surface-container-low hover:border-primary-fixed-dim'}`}>
                  <span className={`block text-sm font-semibold ${statusKey === 'completed' ? 'text-text-muted line-through' : 'text-text-main'}`}>
                    {getPatientName(appointment)}
                  </span>
                  <span className="mt-1 block text-xs text-text-muted">
                    {(getVisitReason(appointment) || 'Appointment')} - {appointment.consultationType || 'Consultation'}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  </section>
);

const PatientAvatar = ({ appointment, name, size = 'default' }) => {
  const avatar = getPatientAvatar(appointment);
  const sizeClass = size === 'large' ? 'h-16 w-16 text-lg' : 'h-10 w-10 text-sm';

  if (avatar) {
    return <img alt={name} className={`${sizeClass} shrink-0 rounded-full border border-surface-border object-cover`} src={avatar} />;
  }

  return (
    <div className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full border border-surface-border bg-surface-container-highest font-bold text-text-muted`}>
      {getPatientInitials(name)}
    </div>
  );
};

const InfoBlock = ({ icon, label, value }) => (
  <div>
    <p className="mb-1 text-xs font-semibold uppercase text-text-muted">{label}</p>
    <p className="mb-0 flex items-center gap-1 text-sm font-semibold text-text-main">
      {icon ? <span className="material-symbols-outlined text-[16px] text-text-muted">{icon}</span> : null}
      {value}
    </p>
  </div>
);

const LoadingState = () => (
  <div className="rounded-lg border border-surface-border bg-white py-12 text-center">
    <div className="spinner-border text-primary" role="status">
      <span className="visually-hidden">Loading...</span>
    </div>
  </div>
);

const EmptyState = ({ title, description }) => (
  <div className="rounded-lg border border-dashed border-surface-border bg-white p-8 text-center">
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-container text-text-muted">
      <span className="material-symbols-outlined">calendar_today</span>
    </div>
    <h3 className="mb-1 mt-3 text-base font-bold text-text-main">{title}</h3>
    <p className="mb-0 text-sm text-text-muted">{description}</p>
  </div>
);
