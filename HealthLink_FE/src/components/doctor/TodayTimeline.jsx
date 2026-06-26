import React, { useMemo } from 'react';
import {
  toDateInputValue,
  getPatientName,
  getVisitReason,
  getStatusKey,
  parseAppointmentDate,
  formatTimeFromDate,
} from '@utils/doctor/appointmentHelpers';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const getCalendarDays = (dateStr) => {
  const date = new Date(`${dateStr}T00:00:00`);
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const selectedDay = date.getDate();

  const days = [];
  for (let i = 0; i < startOffset; i++) {
    days.push({ day: 0, label: '', muted: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday =
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === d;
    const isSelected = d === selectedDay;
    const isPast = new Date(year, month, d) < todayStart && !isToday;
    days.push({ day: d, label: String(d), isToday, isSelected, isPast });
  }
  return days;
};

const TodayTimeline = ({ appointments, loading, selectedDate, onView, onDateChange }) => {
  const calendarDays = useMemo(() => getCalendarDays(selectedDate), [selectedDate]);
  const isCurrentMonth = useMemo(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }, [selectedDate]);

  return (
    <section className="doctor-timeline">
      <div className="doctor-timeline__header">
        <h2 className="doctor-timeline__title">
          <span className="doctor-timeline__title-dot" />
          Today's Schedule
        </h2>
        <div className="d-flex gap-1 align-items-center">
          <button
            className="doctor-timeline__nav-btn"
            disabled={isCurrentMonth}
            onClick={() => {
              const d = new Date(selectedDate + 'T00:00:00');
              d.setMonth(d.getMonth() - 1);
              onDateChange(toDateInputValue(d));
            }}
            type="button"
            aria-label="Previous month"
          >
            <span className="material-symbols-outlined" style={{fontSize:'1rem'}}>chevron_left</span>
          </button>
          <span style={{fontSize:'0.8rem',fontWeight:600,whiteSpace:'nowrap'}}>
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short'}).replace('.', '')}
          </span>
          <button
            className="doctor-timeline__nav-btn"
            onClick={() => {
              const d = new Date(selectedDate + 'T00:00:00');
              d.setMonth(d.getMonth() + 1);
              onDateChange(toDateInputValue(d));
            }}
            type="button"
            aria-label="Next month"
          >
            <span className="material-symbols-outlined" style={{fontSize:'1rem'}}>chevron_right</span>
          </button>
        </div>
      </div>

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
                      : day.isPast
                        ? 'doctor-timeline__calendar-day--past'
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
                onClick={() => onView(appointment)}
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

export default TodayTimeline;
