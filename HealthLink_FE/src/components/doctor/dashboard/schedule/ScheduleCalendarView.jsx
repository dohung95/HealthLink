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

const statusClasses = {
  WORKING: 'bg-success/10 text-success border-success/30',
  DAY_OFF: 'bg-critical/10 text-critical border-critical/30',
  MODIFIED: 'bg-warning/10 text-warning border-warning/30',
  NO_SCHEDULE: 'bg-surface-container text-text-muted border-surface-border',
};

const slotClasses = {
  AVAILABLE: 'bg-success/10 border-success/30 text-success',
  BOOKED: 'bg-primary-fixed border-primary-fixed-dim text-primary',
  HELD: 'bg-warning/10 border-warning/30 text-warning',
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
        <span className="rounded-full bg-primary-container px-1.5 text-[10px] font-bold text-white">{bookedCount}</span>
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
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="grid gap-4">
        <section className="relative rounded-lg border border-surface-border bg-white p-4">
          {loading ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/70">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : null}
          <Calendar
            className="doctor-schedule-calendar w-full border-0"
            minDate={new Date()}
            onActiveStartDateChange={handleActiveStartDateChange}
            onChange={handleDateClick}
            tileClassName={tileClassName}
            tileContent={tileContent}
            value={selectedDate}
          />
        </section>

        <section className="rounded-lg border border-surface-border bg-white">
          <div className="border-b border-surface-border bg-surface-container-low px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="mb-0 text-sm font-bold text-text-main">
                {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </h3>
              <span className={`rounded border px-2 py-0.5 text-[11px] font-bold ${statusClasses[selectedDaySlots?.status] || statusClasses.NO_SCHEDULE}`}>
                {(selectedDaySlots?.status || 'NO_SCHEDULE').replace('_', ' ')}
              </span>
            </div>
          </div>

          <div className="p-4">
            {selectedDaySlots?.slots?.length ? (
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {selectedDaySlots.slots.map((slot, index) => (
                  <article className={`rounded border p-3 text-center ${slotClasses[slot.status] || slotClasses.AVAILABLE}`} key={`${slot.startTime}-${index}`}>
                    <p className="mb-1 text-sm font-bold text-text-main">{formatTime(slot.startTime)} - {formatTime(slot.endTime)}</p>
                    <p className="mb-0 text-xs font-semibold">
                      {slot.status === 'BOOKED' && slot.patientName ? slot.patientName : slot.status}
                    </p>
                    {slot.appointmentId ? <p className="mb-0 mt-1 text-[11px] text-text-muted">Appointment #{slot.appointmentId}</p> : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className="mb-0 text-sm text-text-muted">No slots for this day.</p>
            )}

            <button className="mt-4 flex items-center gap-1 rounded border border-primary-container px-3 py-2 text-sm font-semibold text-primary-container hover:bg-primary-fixed" onClick={() => onCreateException(selectedDate)} type="button">
              <span className="material-symbols-outlined text-[16px]">add</span>
              Add Exception for this day
            </button>
          </div>
        </section>
      </div>

      <aside className="grid content-start gap-4">
        <section className="rounded-lg border border-surface-border bg-white">
          <div className="border-b border-surface-border bg-surface-container-low px-4 py-3">
            <h3 className="mb-0 text-sm font-bold text-text-main">Legend</h3>
          </div>
          <div className="grid gap-3 p-4 text-sm text-text-main">
            <LegendItem color="bg-success" label="Working (Available)" />
            <LegendItem color="bg-critical" label="Day Off" />
            <LegendItem color="bg-warning" label="Modified Hours" />
            <LegendItem color="bg-text-muted" label="No Schedule" />
          </div>
        </section>

        <section className="rounded-lg border border-surface-border bg-white">
          <div className="flex items-center justify-between border-b border-surface-border bg-surface-container-low px-4 py-3">
            <h3 className="mb-0 text-sm font-bold text-text-main">Upcoming Exceptions</h3>
            <span className="rounded bg-surface-container px-2 py-0.5 text-xs font-bold text-text-muted">{upcomingExceptions.length}</span>
          </div>
          <div className="grid gap-3 p-4">
            {upcomingExceptions.length === 0 ? (
              <p className="mb-0 text-sm text-text-muted">No upcoming exceptions.</p>
            ) : (
              upcomingExceptions.map((exception) => (
                <article className="rounded border border-surface-border p-3" key={exception.exceptionId}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="mb-1 text-sm font-bold text-text-main">{new Date(exception.exceptionDate).toLocaleDateString()}</p>
                      <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${exception.exceptionType === 'DayOff' ? 'bg-critical/10 text-critical' : exception.exceptionType === 'Modified' ? 'bg-warning/10 text-warning' : 'bg-primary-fixed text-primary'}`}>
                        {exception.exceptionType}
                      </span>
                    </div>
                    {!exception.isAdminCreated ? (
                      <button className="rounded p-1 text-text-muted hover:bg-error-container/30 hover:text-critical" disabled={deletingId === exception.exceptionId} onClick={() => handleDeleteException(exception.exceptionId)} title="Delete exception" type="button">
                        <span className="material-symbols-outlined text-[16px]">{deletingId === exception.exceptionId ? 'progress_activity' : 'delete'}</span>
                      </button>
                    ) : null}
                  </div>
                  <p className="mb-0 mt-2 text-xs text-text-muted">
                    {exception.reason}
                    {exception.isAdminCreated ? <span className="ml-2 rounded bg-surface-container px-1.5 py-0.5 text-[10px] font-bold">Admin Created</span> : null}
                  </p>
                  {exception.startTime && exception.endTime ? (
                    <p className="mb-0 mt-2 flex items-center gap-1 text-xs text-text-main">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      {formatTime(exception.startTime)} - {formatTime(exception.endTime)}
                    </p>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </section>
      </aside>
    </div>
  );
};

const LegendItem = ({ color, label }) => (
  <div className="flex items-center gap-2">
    <span className={`h-3 w-3 rounded-full ${color}`} />
    <span>{label}</span>
  </div>
);

export default ScheduleCalendarView;
