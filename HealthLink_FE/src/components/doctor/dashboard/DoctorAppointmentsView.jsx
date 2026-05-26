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
    badge: 'badge bg-surface-container-highest text-text-muted',
    railClass: 'doctor-appointment-card__rail--scheduled',
    dot: 'bg-surface-variant',
  },
  completed: {
    badge: 'badge bg-success text-white',
    railClass: 'doctor-appointment-card__rail--completed',
    dot: 'bg-success',
  },
  cancelled: {
    badge: 'badge bg-critical text-white',
    railClass: 'doctor-appointment-card__rail--cancelled',
    dot: 'bg-critical',
  },
  inprogress: {
    badge: 'badge bg-warning text-white',
    railClass: 'doctor-appointment-card__rail--inprogress',
    dot: 'bg-warning',
  },
  default: {
    badge: 'badge bg-surface-container text-text-main',
    railClass: '',
    dot: 'bg-primary-container',
  },
};

const TYPE_TONES = {
  video: 'badge bg-primary text-white',
  audio: 'badge bg-surface-container text-text-main',
  chat: 'badge bg-surface-container-highest text-text-main',
  offline: 'badge bg-surface-container text-text-main',
  default: 'badge bg-surface-container text-text-main',
};

const toDateInputValue = (date) => {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return '';

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  return parts.join(' • ');
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
    <div className="doctor-content-section">
      {/* Page Header */}
      <div className="doctor-page-header mb-3">
        <h1 className="doctor-page-header__title">Appointments</h1>
        <p className="doctor-page-header__subtitle">{selectedDateLabel} &middot; {counts.all} appointment{counts.all !== 1 ? 's' : ''}</p>
      </div>

      {/* Quick Stats Row */}
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
        {/* Main Left Column */}
        <div className="col-lg-8 d-flex flex-column gap-4">
          {/* Next Appointment Highlight */}
          <NextAppointmentCard appointment={nextAppointment} onView={handleView} selectedDate={selectedDate} />

          {/* Appointments Section */}
          <div className="d-flex flex-column gap-3">
            {/* Filters & Search */}
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

            {/* Appointments List */}
            {loading ? (
              <LoadingState />
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

        {/* Right Sidebar - Today's Schedule */}
        <aside className="col-lg-4">
          <TodayTimeline appointments={sortedAppointments} loading={loading} selectedDate={selectedDate} onView={handleView} onDateChange={setSelectedDate} />
        </aside>
      </div>
    </div>
  );
}

/* ==================== NEXT APPOINTMENT CARD ==================== */

const NextAppointmentCard = ({ appointment, onView, selectedDate }) => {
  if (!appointment) {
    return (
      <div className="doctor-card">
        <div className="doctor-card-body text-center">
          <span className="material-symbols-outlined fs-2 text-text-muted">event_available</span>
          <h3 className="mb-1 mt-2 fs-6 fw-semibold text-text-main">No upcoming appointment</h3>
          <p className="mb-0 small text-text-muted">{formatShortDate(selectedDate)}</p>
        </div>
      </div>
    );
  }

  const patientName = getPatientName(appointment);
  const reason = getVisitReason(appointment);
  const patientMeta = getPatientMeta(appointment);
  const appointmentDate = parseAppointmentDate(appointment);
  const diffMinutes = appointmentDate ? Math.round((appointmentDate.getTime() - Date.now()) / 60000) : null;
  const statusKey = getStatusKey(appointment);

  return (
    <div className="doctor-next-card">
      <div className="doctor-next-card__header">
        <h2 className="d-flex align-items-center gap-2 mb-0 small fw-bold text-text-main">
          <span className="d-inline-block rounded-circle bg-primary" style={{width:'0.5rem',height:'0.5rem',opacity:0.8}} />
          Next Appointment
        </h2>
        {diffMinutes != null && diffMinutes >= 0 ? (
          <span className="badge bg-primary text-white" style={{fontSize:'0.625rem',letterSpacing:'0.05em'}}>
            In {diffMinutes < 60 ? `${diffMinutes} mins` : `${Math.round(diffMinutes / 60)} hrs`}
          </span>
        ) : (
          <span className={STATUS_TONES[statusKey]?.badge || 'badge bg-surface-container text-text-main'} style={{fontSize:'0.625rem',letterSpacing:'0.05em'}}>{getDisplayStatus(appointment)}</span>
        )}
      </div>

      <div className="doctor-next-card__body">
        <div className="flex-1 border-md-end border-surface-border pe-md-4">
          <div className="d-flex align-items-center gap-3 mb-3">
            <PatientAvatar appointment={appointment} name={patientName} size="large" />
            <div className="min-w-0">
              <h3 className="fw-semibold text-text-main text-truncate mb-0" style={{fontSize:'1rem',lineHeight:'1.25'}}>{patientName}</h3>
              {patientMeta ? <p className="text-text-muted text-truncate mb-0" style={{fontSize:'0.8125rem',marginTop:'0.125rem'}}>{patientMeta}</p> : null}
            </div>
          </div>

          <div className="d-flex flex-column" style={{gap:'0.5rem'}}>
            <div className="d-flex flex-wrap align-items-center" style={{gap:'1.25rem 0.25rem'}}>
              <div>
                <span className="small text-uppercase text-text-muted" style={{fontSize:'0.6875rem',fontWeight:'600',letterSpacing:'0.06em'}}>Time</span>
                <span className="ms-1 small fw-medium text-text-main">{formatTimeFromDate(appointmentDate)}</span>
              </div>
              <div>
                <span className="small text-uppercase text-text-muted" style={{fontSize:'0.6875rem',fontWeight:'600',letterSpacing:'0.06em'}}>Type</span>
                <span className="ms-1 small fw-medium text-text-main">
                  <span className="material-symbols-outlined align-middle me-1" style={{fontSize:'14px',color:'var(--text-muted)'}}>{getTypeIcon(appointment.consultationType)}</span>
                  {appointment.consultationType || 'Consultation'}
                </span>
              </div>
            </div>
            <div>
              <span className="small text-uppercase text-text-muted" style={{fontSize:'0.6875rem',fontWeight:'600',letterSpacing:'0.06em'}}>Reason</span>
              <p className="small fw-medium text-text-main mb-0" style={{marginTop:'0.125rem',lineHeight:'1.5'}}>{reason || 'Not provided'}</p>
            </div>
          </div>
        </div>

        <div className="d-flex flex-column justify-content-center gap-2" style={{minWidth:'160px'}}>
          <button className="btn btn-primary btn-sm w-100 d-flex align-items-center justify-content-center gap-1" onClick={() => onView(appointment)} type="button">
            <span className="material-symbols-outlined" style={{fontSize:'0.875rem'}}>open_in_new</span>
            Open Detail
          </button>
          <button className="btn btn-outline-primary btn-sm w-100 d-flex align-items-center justify-content-center gap-1" onClick={() => onView(appointment)} type="button">
            <span className="material-symbols-outlined" style={{fontSize:'0.875rem'}}>description</span>
            Medical History
          </button>
        </div>
      </div>
    </div>
  );
};

/* ==================== APPOINTMENT CARD ==================== */

const AppointmentCard = ({ appointment, onView }) => {
  const patientName = getPatientName(appointment);
  const reason = getVisitReason(appointment);
  const appointmentDate = parseAppointmentDate(appointment);
  const typeKey = getTypeKey(appointment.consultationType);
  const statusKey = getStatusKey(appointment);
  const statusTone = STATUS_TONES[statusKey] || STATUS_TONES.default;

  const actionConfig = {
    inprogress: { label: 'Join Call', active: true },
    scheduled: { label: 'View Details', active: true },
    completed: { label: 'Notes', active: true },
    cancelled: { label: '', active: false },
  };

  const action = actionConfig[statusKey] || actionConfig.scheduled;

  return (
    <article className="doctor-appointment-card" style={{opacity: statusKey === 'completed' || statusKey === 'cancelled' ? '0.65' : '1'}}>
      <div className={`doctor-appointment-card__rail ${statusTone.railClass}`} />
      
      {/* Time */}
      <div className="doctor-appointment-card__time">
        <div className="doctor-appointment-card__time-value">{formatTimeFromDate(appointmentDate)}</div>
        <div className="doctor-appointment-card__time-duration">{getDurationLabel(appointment)}</div>
      </div>

      <div className="doctor-appointment-card__divider d-none d-md-block" />

      {/* Patient Info */}
      <div className="doctor-appointment-card__patient">
        <PatientAvatar appointment={appointment} name={patientName} size="compact" />
        <div className="doctor-appointment-card__patient-info">
          <p className="doctor-appointment-card__patient-name">{patientName}</p>
          <p className="doctor-appointment-card__patient-reason">{reason || 'Appointment'}</p>
        </div>
      </div>

      {/* Type & Status */}
      <div className="d-flex align-items-center gap-2">
        <span className={`d-inline-flex align-items-center gap-1 ${TYPE_TONES[typeKey] || TYPE_TONES.default}`}>
          <span className="material-symbols-outlined" style={{fontSize:'12px'}}>{getTypeIcon(appointment.consultationType)}</span>
          {appointment.consultationType || 'Consultation'}
        </span>
        <span className={`d-inline-flex align-items-center gap-1 ${statusTone.badge}`}>
          {statusKey === 'inprogress' ? <span className="d-inline-block rounded-circle bg-white" style={{width:'0.375rem',height:'0.375rem',opacity:0.9}} /> : null}
          {getDisplayStatus(appointment)}
        </span>
      </div>

      {/* Action */}
      <div className="flex-shrink-0">
        {action.active ? (
          <button className={`btn btn-sm ${statusKey === 'inprogress' ? 'btn-primary' : statusKey === 'scheduled' ? 'btn-outline-primary' : 'btn-link text-decoration-none'} d-flex align-items-center gap-1`} onClick={() => onView(appointment)} type="button">
            {action.label}
          </button>
        ) : (
          <span className="small text-text-muted fst-italic">No action</span>
        )}
      </div>
    </article>
  );
};

/* ==================== TODAY'S SCHEDULE / TIMELINE ==================== */

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const getCalendarDays = (dateStr) => {
  const date = new Date(`${dateStr}T00:00:00`);
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const selectedDay = date.getDate();

  const days = [];
  // Previous month fillers
  for (let i = 0; i < startOffset; i++) {
    days.push({ day: 0, label: '', muted: true });
  }
  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday =
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === d;
    const isSelected = d === selectedDay;
    days.push({ day: d, label: String(d), isToday, isSelected });
  }
  return days;
};

const TodayTimeline = ({ appointments, loading, selectedDate, onView, onDateChange }) => {
  const calendarDays = useMemo(() => getCalendarDays(selectedDate), [selectedDate]);

  return (
    <section className="doctor-timeline">
      {/* Header */}
      <div className="doctor-timeline__header">
        <h2 className="doctor-timeline__title">
          <span className="doctor-timeline__title-dot" />
          Today's Schedule
        </h2>
        <div className="d-flex gap-1">
          <button
            className="doctor-timeline__nav-btn"
            onClick={() => {
              const d = new Date(selectedDate + 'T00:00:00');
              d.setDate(d.getDate() - 1);
              onDateChange(toDateInputValue(d));
            }}
            type="button"
            aria-label="Previous day"
          >
            <span className="material-symbols-outlined" style={{fontSize:'1rem'}}>chevron_left</span>
          </button>
          <button
            className="doctor-timeline__nav-btn"
            onClick={() => {
              const d = new Date(selectedDate + 'T00:00:00');
              d.setDate(d.getDate() + 1);
              onDateChange(toDateInputValue(d));
            }}
            type="button"
            aria-label="Next day"
          >
            <span className="material-symbols-outlined" style={{fontSize:'1rem'}}>chevron_right</span>
          </button>
        </div>
      </div>

      {/* Mini Calendar */}
      <div className="doctor-timeline__calendar">
        <div className="doctor-timeline__calendar-weekdays">
          {WEEKDAYS.map((day, idx) => (
            <div className="doctor-timeline__calendar-weekday" key={`wd-${idx}`}>{day}</div>
          ))}
        </div>
        <div className="doctor-timeline__calendar-days">
          {calendarDays.map((day, idx) => (
            day.day === 0 ? (
              <div key={`empty-${idx}`} />
            ) : (
              <button
                className={`doctor-timeline__calendar-day ${
                  day.isSelected
                    ? 'doctor-timeline__calendar-day--selected'
                    : day.isToday
                      ? 'doctor-timeline__calendar-day--today'
                      : ''
                }`}
                key={`day-${day.day}`}
                onClick={() => {
                  const d = new Date(selectedDate + 'T00:00:00');
                  d.setDate(d.getDate() + (day.day - d.getDate()));
                  onDateChange(toDateInputValue(d));
                }}
                type="button"
              >
                {day.label}
              </button>
            )
          ))}
        </div>
      </div>

      {/* Schedule List */}
      <div className="doctor-timeline__list">
        {loading ? (
          <div className="py-4 text-center">
            <div className="spinner-border spinner-border-sm text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : appointments.length === 0 ? (
          <div className="doctor-empty-state" style={{minHeight:'100px',padding:'1.25rem'}}>
            <p className="doctor-empty-state__desc mb-0">No appointments for this day.</p>
          </div>
        ) : (
          appointments.map((appointment) => {
            const statusKey = getStatusKey(appointment);
            const appointmentDate = parseAppointmentDate(appointment);
            const isCompleted = statusKey === 'completed' || statusKey === 'cancelled';
            const isCurrent = statusKey === 'inprogress';

            const dotClass =
              statusKey === 'inprogress' ? 'doctor-timeline__item-dot-inner--inprogress' :
              statusKey === 'completed' ? 'doctor-timeline__item-dot-inner--completed' :
              statusKey === 'cancelled' ? 'doctor-timeline__item-dot-inner--cancelled' :
              'doctor-timeline__item-dot-inner--scheduled';

            return (
              <button
                className={`doctor-timeline__item ${isCompleted ? 'doctor-timeline__item--completed' : ''}`}
                key={`timeline-${appointment.appointmentID || appointment.appointmentId}`}
                onClick={() => !isCompleted && onView(appointment)}
                type="button"
              >
                <div className="doctor-timeline__item-time">
                  {formatTimeFromDate(appointmentDate)}
                </div>
                <div className="doctor-timeline__item-dot">
                  <div className={`doctor-timeline__item-dot-inner ${dotClass}`} />
                </div>
                <div className={`doctor-timeline__item-card ${isCurrent ? 'doctor-timeline__item-card--inprogress' : ''}`}>
                  <p className="doctor-timeline__item-card-name">
                    {getPatientName(appointment)}
                  </p>
                  <p className="doctor-timeline__item-card-reason">
                    {getVisitReason(appointment) || 'Appointment'}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
};

/* ==================== PATIENT AVATAR ==================== */

const PatientAvatar = ({ appointment, name, size = 'card' }) => {
  const avatar = getPatientAvatar(appointment);
  const sizeMap = {
    xlarge: { width: '3.5rem', height: '3.5rem', fontSize: '0.875rem' },
    card: { width: '2rem', height: '2rem', fontSize: '0.75rem' },
    large: { width: '2.5rem', height: '2.5rem', fontSize: '0.75rem' },
    medium: { width: '2rem', height: '2rem', fontSize: '10px' },
    compact: { width: '1.5rem', height: '1.5rem', fontSize: '9px' },
    default: { width: '1.75rem', height: '1.75rem', fontSize: '10px' },
  };
  const sizeStyle = sizeMap[size] || sizeMap.default;

  if (avatar) {
    return <img alt={name} className="shrink-0 rounded-circle object-fit-cover border border-surface-border" src={avatar} style={sizeStyle} />;
  }

  return (
    <div className="shrink-0 rounded-circle border border-surface-border bg-surface-container-highest d-flex align-items-center justify-content-center fw-bold text-text-muted" style={sizeStyle}>
      {getPatientInitials(name)}
    </div>
  );
};

/* ==================== STATES ==================== */

const LoadingState = () => (
  <div className="doctor-empty-state">
    <div className="spinner-border text-primary" role="status">
      <span className="visually-hidden">Loading...</span>
    </div>
  </div>
);

