import React, { useCallback, useEffect, useState } from 'react';
import Calendar from 'react-calendar';
import { toast } from 'sonner';
import { doctorScheduleService } from '../../../../api/doctorApi';
import 'react-calendar/dist/Calendar.css';

const getMonthRange = (date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start, end };
};

const toDateValue = (date) => date.toISOString().split('T')[0];

const formatTime = (time) => {
  if (!time) return '';
  const parts = String(time).split(':');
  return `${parts[0]}:${parts[1]}`;
};

const STATUS_CLASSES = {
  WORKING: 'doctor-schedule-item__tag bg-success/10 text-success',
  DAY_OFF: 'doctor-schedule-item__tag bg-critical/10 text-critical',
  MODIFIED: 'doctor-schedule-item__tag bg-warning/10 text-warning',
  NO_SCHEDULE: 'doctor-schedule-item__tag bg-surface-container text-text-muted',
};

const ScheduleCalendarView = ({ exceptions, onCreateException, onRefresh }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDaySlots, setSelectedDaySlots] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [viewRange, setViewRange] = useState(() => getMonthRange(new Date()));

  const fetchCalendarData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await doctorScheduleService.getCalendarView(toDateValue(viewRange.start), toDateValue(viewRange.end));
      setCalendarData(data);
      const selectedDay = data.find((day) => day.date === toDateValue(selectedDate));
      setSelectedDaySlots(selectedDay || null);
    } catch (err) {
      console.error('Error fetching calendar data:', err);
      toast.error('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, viewRange]);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  const getDayData = (date) => {
    const dateStr = toDateValue(date);
    return calendarData.find((day) => day.date === dateStr);
  };

  const tileClassName = ({ date, view }) => {
    if (view !== 'month') return '';
    const dayData = getDayData(date);
    if (!dayData) return 'calendar-day-no-schedule';

    switch (dayData.status) {
      case 'WORKING':
        return 'calendar-day-working';
      case 'DAY_OFF':
        return 'calendar-day-off';
      case 'MODIFIED':
        return 'calendar-day-modified';
      default:
        return 'calendar-day-no-schedule';
    }
  };

  const tileContent = ({ date, view }) => {
    if (view !== 'month') return null;
    const dayData = getDayData(date);
    if (!dayData?.slots?.length) return null;

    const bookedCount = dayData.slots.filter((slot) => slot.status === 'BOOKED').length;
    if (!bookedCount) return null;

    return (
      <div className="calendar-tile-info">
        <span className="calendar-tile-info__count">{bookedCount}</span>
      </div>
    );
  };

  const handleActiveStartDateChange = ({ activeStartDate, view }) => {
    if (view === 'month') {
      setViewRange(getMonthRange(activeStartDate));
    }
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setSelectedDaySlots(getDayData(date) || null);
  };

  const handleDeleteException = async (exceptionId) => {
    if (!window.confirm('Are you sure you want to delete this exception?')) return;

    try {
      setDeletingId(exceptionId);
      await doctorScheduleService.deleteException(exceptionId);
      toast.success('Exception deleted successfully');
      onRefresh();
      fetchCalendarData();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error(err.response?.data?.message || 'Failed to delete exception');
    } finally {
      setDeletingId(null);
    }
  };

  const upcomingExceptions = exceptions
    .filter((exception) => new Date(exception.exceptionDate) >= new Date())
    .sort((left, right) => new Date(left.exceptionDate) - new Date(right.exceptionDate))
    .slice(0, 5);

  return (
    <div className="row g-3">
      <div className="col-lg-8 col-xl-9 d-flex flex-column gap-3">          <section className="doctor-calendar-section">
          {loading ? (
            <div className="calendar-loading-overlay">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : null}
          <div className="doctor-calendar-section__body">
            <Calendar
              className="doctor-schedule-calendar w-100 border-0"
              minDate={new Date()}
              onActiveStartDateChange={handleActiveStartDateChange}
              onChange={handleDateClick}
              tileClassName={tileClassName}
              tileContent={tileContent}
              value={selectedDate}
            />
          </div>
        </section>

        <section className="doctor-calendar-slots">
          <div className="doctor-calendar-slots__header">
            <h3 className="doctor-calendar-slots__date">
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </h3>
            <span className={`doctor-calendar-slots__status ${STATUS_CLASSES[selectedDaySlots?.status] || STATUS_CLASSES.NO_SCHEDULE}`}>
              {(selectedDaySlots?.status || 'NO_SCHEDULE').replace(/_/g, ' ')}
            </span>
          </div>

          <div className="doctor-calendar-slots__body">
            {selectedDaySlots?.slots?.length ? (
              <div className="row g-2">
                {selectedDaySlots.slots.map((slot, index) => {
                  const slotStatus = slot.status || 'AVAILABLE';
                  const slotClass = 
                    slotStatus === 'BOOKED' ? 'doctor-slot-card--booked' :
                    slotStatus === 'HELD' ? 'doctor-slot-card--held' :
                    'doctor-slot-card--available';
                  
                  return (
                    <article className="col-sm-6 col-xl-3" key={`${slot.startTime}-${index}`}>
                      <div className={`doctor-slot-card ${slotClass}`}>
                        <p className="doctor-slot-card__time">{formatTime(slot.startTime)} - {formatTime(slot.endTime)}</p>
                        <p className="doctor-slot-card__status">
                          {slotStatus === 'BOOKED' && slot.patientName ? slot.patientName : slotStatus}
                        </p>
                        {slot.appointmentId ? <p className="doctor-slot-card__appointment">Appointment #{slot.appointmentId}</p> : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="mb-0 text-sm text-text-muted">No slots for this day.</p>
            )}

            <button className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1 mt-3" onClick={() => onCreateException(selectedDate)} type="button">
              <span className="material-symbols-outlined" style={{fontSize:'1rem'}}>add</span>
              Add Exception for this day
            </button>
          </div>
        </section>
      </div>

      <aside className="col-lg-4 col-xl-3 d-flex flex-column gap-3">
        <section className="doctor-calendar-panel">
          <div className="doctor-calendar-panel__header">
            <h3 className="doctor-calendar-panel__title">Legend</h3>
          </div>
          <div className="doctor-calendar-panel__body">
            <div className="doctor-legend">
              <div className="doctor-legend__item">
                <span className="doctor-legend__dot doctor-legend__dot--working" />
                Working (Available)
              </div>
              <div className="doctor-legend__item">
                <span className="doctor-legend__dot doctor-legend__dot--dayoff" />
                Day Off
              </div>
              <div className="doctor-legend__item">
                <span className="doctor-legend__dot doctor-legend__dot--modified" />
                Modified Hours
              </div>
              <div className="doctor-legend__item">
                <span className="doctor-legend__dot doctor-legend__dot--noschedule" />
                No Schedule
              </div>
            </div>
          </div>
        </section>

        <section className="doctor-calendar-panel">
          <div className="doctor-calendar-panel__header">
            <h3 className="doctor-calendar-panel__title">Upcoming Exceptions</h3>
            <span className="doctor-calendar-panel__badge">{upcomingExceptions.length}</span>
          </div>
          <div className="doctor-calendar-panel__body d-flex flex-column gap-2">
            {upcomingExceptions.length === 0 ? (
              <p className="mb-0 text-sm text-text-muted">No upcoming exceptions.</p>
            ) : (
              upcomingExceptions.map((exception) => {
                const typeClass = 
                  exception.exceptionType === 'DayOff' ? 'doctor-exception-card__type--dayoff' :
                  exception.exceptionType === 'Modified' ? 'doctor-exception-card__type--modified' :
                  'doctor-exception-card__type--addslot';

                return (
                  <article className="doctor-exception-card" key={exception.exceptionId}>
                    <div className="doctor-exception-card__top">
                      <div>
                        <p className="doctor-exception-card__date">{new Date(exception.exceptionDate).toLocaleDateString()}</p>
                        <span className={`doctor-exception-card__type ${typeClass}`}>{exception.exceptionType}</span>
                      </div>
                      {!exception.isAdminCreated ? (
                        <button className="doctor-exception-card__delete" disabled={deletingId === exception.exceptionId} onClick={() => handleDeleteException(exception.exceptionId)} title="Delete exception" type="button">
                          <span className="material-symbols-outlined">{deletingId === exception.exceptionId ? 'progress_activity' : 'delete'}</span>
                        </button>
                      ) : null}
                    </div>
                    <p className="doctor-exception-card__reason">
                      {exception.reason}
                      {exception.isAdminCreated ? <span className="doctor-exception-card__admin-badge">Admin Created</span> : null}
                    </p>
                    {exception.startTime && exception.endTime ? (
                      <p className="doctor-exception-card__time">
                        <span className="material-symbols-outlined">schedule</span>
                        {formatTime(exception.startTime)} - {formatTime(exception.endTime)}
                      </p>
                    ) : null}
                  </article>
                );
              })
            )}
          </div>
        </section>
      </aside>
    </div>
  );
};

export default ScheduleCalendarView;
