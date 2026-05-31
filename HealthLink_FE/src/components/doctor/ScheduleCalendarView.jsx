import React, { useCallback, useEffect, useState } from 'react';
import Calendar from 'react-calendar';
import { toast } from 'sonner';
import { doctorScheduleService } from '@api/doctorApi';
import 'react-calendar/dist/Calendar.css';

const getMonthRange = (date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start, end };
};

const toDateValue = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatTime = (time) => {
  if (!time) return '';
  const parts = String(time).split(':');
  return `${parts[0]}:${parts[1]}`;
};

const getStatusMeta = (status) => {
  switch (status) {
    case 'WORKING':
      return { cls: 'working', label: 'Available', icon: 'check_circle' };
    case 'DAY_OFF':
      return { cls: 'dayoff', label: 'Day Off', icon: 'block' };
    case 'MODIFIED':
      return { cls: 'modified', label: 'Modified', icon: 'schedule' };
    default:
      return { cls: 'noschedule', label: 'No Schedule', icon: 'calendar_today' };
  }
};

const ScheduleCalendarView = ({ exceptions, onCreateException, onRefresh }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [viewRange, setViewRange] = useState(() => getMonthRange(new Date()));

  const fetchCalendarData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await doctorScheduleService.getCalendarView(toDateValue(viewRange.start), toDateValue(viewRange.end));
      setCalendarData(data);
    } catch (err) {
      console.error('Error fetching calendar data:', err);
      if (err.response?.status === 403) {
        toast.error('Session expired. Please refresh the page.');
      } else {
        toast.error('Failed to load calendar data');
      }
    } finally {
      setLoading(false);
    }
  }, [viewRange]);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  const getDayData = (date) => {
    const dateStr = toDateValue(date);
    return calendarData.find((day) => day.date === dateStr);
  };

  const selectedDayData = getDayData(selectedDate);
  const selectedMeta = selectedDayData ? getStatusMeta(selectedDayData.status) : null;

  const tileClassName = ({ date, view }) => {
    if (view !== 'month') return '';
    const dayData = getDayData(date);
    if (!dayData) return '';
    return `calendar-day-status calendar-day-status--${dayData.status ? 'has' : 'no'}-data`;
  };

  const tileContent = ({ date, view }) => {
    if (view !== 'month') return null;
    const dayData = getDayData(date);
    if (!dayData) return null;

    const meta = getStatusMeta(dayData.status);
    const dotCls = meta.cls === 'noschedule' ? 'noschedule' : meta.cls;

    return (
      <span className={`calendar-day-indicator calendar-day-indicator--${dotCls}`} />
    );
  };

  const handleActiveStartDateChange = ({ activeStartDate, view }) => {
    if (view === 'month') {
      setViewRange(getMonthRange(activeStartDate));
    }
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
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

  const getExceptionAccent = (type) => {
    if (type === 'DayOff') return 'dayoff';
    if (type === 'Modified') return 'modified';
    return 'addslot';
  };

  const getExceptionTypeClass = (type) => {
    if (type === 'DayOff') return 'dayoff';
    if (type === 'Modified') return 'modified';
    return 'addslot';
  };

  return (
    <div className="calendar-view-main">
      <div className="row g-4">
        <div className="col-lg-8">
          <div className="calendar-card">
            <div className="calendar-card__header">
              <h3 className="calendar-card__title">
                <span className="material-symbols-outlined">calendar_month</span>
                Schedule Calendar
              </h3>
              <button
                className="calendar-card__today-btn"
                onClick={() => {
                  const today = new Date();
                  setSelectedDate(today);
                  setViewRange(getMonthRange(today));
                }}
                type="button"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>today</span>
                Today
              </button>
            </div>

            <div className="calendar-card__body" style={{ position: 'relative' }}>
              {loading && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 'var(--radius-lg, 0.875rem)',
                  background: 'rgba(255,255,255,0.7)',
                  zIndex: 10,
                }}>
                  <div className="spinner-border" style={{ color: 'var(--doctor-primary, #0052cc)', width: '2rem', height: '2rem' }} role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              )}
              <Calendar
                value={selectedDate}
                onChange={handleDateClick}
                tileClassName={tileClassName}
                tileContent={tileContent}
                onActiveStartDateChange={handleActiveStartDateChange}
                className="calendar-modern w-100 border-0"
                locale="en-US"
                showFixedNumberOfWeeks={false}
                tileDisabled={({ date, view }) => view === 'month' && date < new Date(new Date().toDateString())}
              />
            </div>

            {selectedDayData ? (
              <div className="selected-day-bar">
                <span className="selected-day-bar__date">
                  {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
                <span className={`selected-day-bar__status selected-day-bar__status--${selectedMeta.cls}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: '0.8125rem' }}>{selectedMeta.icon}</span>
                  {selectedMeta.label}
                </span>
                {selectedDayData.slots?.length > 0 && (
                  <span className="selected-day-bar__slot-count">
                    {selectedDayData.slots.length} slot{selectedDayData.slots.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className="col-lg-4 d-flex flex-column gap-3">
          <section className="calendar-panel">
            <div className="calendar-panel__header">
              <span className="material-symbols-outlined">legend_toggle</span>
              <h3 className="calendar-panel__title">Legend</h3>
            </div>
            <div className="calendar-panel__body">
              <div className="calendar-legend">
                <div className="calendar-legend__item">
                  <span className="calendar-legend__dot calendar-legend__dot--working" />
                  <span className="calendar-legend__label">Working</span>
                  <span className="material-symbols-outlined calendar-legend__icon">check_circle</span>
                </div>
                <div className="calendar-legend__item">
                  <span className="calendar-legend__dot calendar-legend__dot--dayoff" />
                  <span className="calendar-legend__label">Day Off</span>
                  <span className="material-symbols-outlined calendar-legend__icon">block</span>
                </div>
                <div className="calendar-legend__item">
                  <span className="calendar-legend__dot calendar-legend__dot--modified" />
                  <span className="calendar-legend__label">Modified</span>
                  <span className="material-symbols-outlined calendar-legend__icon">schedule</span>
                </div>
                <div className="calendar-legend__item">
                  <span className="calendar-legend__dot calendar-legend__dot--noschedule" />
                  <span className="calendar-legend__label">No Schedule</span>
                  <span className="material-symbols-outlined calendar-legend__icon">calendar_today</span>
                </div>
              </div>
            </div>
          </section>

          <section className="calendar-panel">
            <div className="calendar-panel__header">
              <span className="material-symbols-outlined">event_note</span>
              <h3 className="calendar-panel__title">Upcoming Exceptions</h3>
              <span className="calendar-panel__badge">{upcomingExceptions.length}</span>
            </div>
            <div className="calendar-panel__body d-flex flex-column gap-2">
              {upcomingExceptions.length === 0 ? (
                <div className="calendar-panel__empty">
                  <span className="material-symbols-outlined">event_busy</span>
                  <p className="calendar-panel__empty-text">No upcoming exceptions</p>
                </div>
              ) : (
                upcomingExceptions.map((exception) => {
                  const accent = getExceptionAccent(exception.exceptionType);
                  const typeClass = getExceptionTypeClass(exception.exceptionType);

                  return (
                    <article className="exception-item" key={exception.exceptionId}>
                      <div className={`exception-item__accent exception-item__accent--${accent}`} />
                      <div className="exception-item__body">
                        <div className="exception-item__top">
                          <div>
                            <p className="exception-item__date">
                              {new Date(exception.exceptionDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </p>
                            <span className={`exception-item__type exception-item__type--${typeClass}`}>
                              {exception.exceptionType === 'AddSlot' ? 'Extra Slot' : exception.exceptionType}
                            </span>
                          </div>
                          {!exception.isAdminCreated ? (
                            <button
                              className="exception-item__delete"
                              disabled={deletingId === exception.exceptionId}
                              onClick={() => handleDeleteException(exception.exceptionId)}
                              title="Delete exception"
                              type="button"
                            >
                              <span className="material-symbols-outlined">
                                {deletingId === exception.exceptionId ? 'progress_activity' : 'delete'}
                              </span>
                            </button>
                          ) : null}
                        </div>
                        <p className="exception-item__reason">
                          {exception.reason}
                          {exception.isAdminCreated ? <span className="exception-item__admin-badge">Admin</span> : null}
                        </p>
                        {exception.startTime && exception.endTime ? (
                          <p className="exception-item__time">
                            <span className="material-symbols-outlined">schedule</span>
                            {formatTime(exception.startTime)} - {formatTime(exception.endTime)}
                          </p>
                        ) : null}
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ScheduleCalendarView;
