import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import { doctorScheduleService } from '../../../../api/doctorApi';
import { toast } from 'sonner';
import 'react-calendar/dist/Calendar.css';

const ScheduleCalendarView = ({ exceptions, onCreateException, onRefresh }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDaySlots, setSelectedDaySlots] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Calculate current month range
  const getMonthRange = (date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return { start, end };
  };

  const [viewRange, setViewRange] = useState(() => getMonthRange(new Date()));

  useEffect(() => {
    fetchCalendarData();
  }, [viewRange]);

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      const startDate = viewRange.start.toISOString().split('T')[0];
      const endDate = viewRange.end.toISOString().split('T')[0];
      const data = await doctorScheduleService.getCalendarView(startDate, endDate);
      setCalendarData(data);
    } catch (err) {
      console.error('Error fetching calendar data:', err);
      toast.error('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  const handleActiveStartDateChange = ({ activeStartDate, view }) => {
    if (view === 'month') {
      setViewRange(getMonthRange(activeStartDate));
    }
  };

  const getDayData = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return calendarData.find(d => d.date === dateStr);
  };

  const tileClassName = ({ date, view }) => {
    if (view !== 'month') return '';
    const dayData = getDayData(date);
    if (!dayData) return 'calendar-day-no-schedule';

    switch (dayData.status) {
      case 'WORKING': return 'calendar-day-working';
      case 'DAY_OFF': return 'calendar-day-off';
      case 'MODIFIED': return 'calendar-day-modified';
      default: return 'calendar-day-no-schedule';
    }
  };

  const tileContent = ({ date, view }) => {
    if (view !== 'month') return null;
    const dayData = getDayData(date);
    if (!dayData || !dayData.slots) return null;

    const bookedCount = dayData.slots.filter(s => s.status === 'BOOKED').length;
    const availableCount = dayData.slots.filter(s => s.status === 'AVAILABLE').length;

    if (bookedCount > 0 || availableCount > 0) {
      return (
        <div className="calendar-tile-info">
          {bookedCount > 0 && (
            <span className="badge bg-primary rounded-pill" style={{ fontSize: '10px' }}>
              {bookedCount}
            </span>
          )}
        </div>
      );
    }
    return null;
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    const dayData = getDayData(date);
    setSelectedDaySlots(dayData);
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

  const formatTime = (time) => {
    if (!time) return '';
    const parts = time.split(':');
    return `${parts[0]}:${parts[1]}`;
  };

  // Filter upcoming exceptions (next 30 days)
  const upcomingExceptions = exceptions
    .filter(e => new Date(e.exceptionDate) >= new Date())
    .sort((a, b) => new Date(a.exceptionDate) - new Date(b.exceptionDate))
    .slice(0, 5);

  return (
    <div className="schedule-calendar-view">
      <div className="row g-4">
        {/* Calendar */}
        <div className="col-lg-8">
          <div className="card shadow-sm">
            <div className="card-body">
              {loading && (
                <div className="position-absolute top-50 start-50 translate-middle">
                  <div className="spinner-border text-primary" role="status">
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
                minDate={new Date()}
                className="w-100 border-0"
              />
            </div>
          </div>

          {/* Selected Day Details */}
          {selectedDaySlots && (
            <div className="card shadow-sm mt-4">
              <div className="card-header bg-light">
                <h6 className="mb-0">
                  {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                  <span className={`badge ms-2 ${
                    selectedDaySlots.status === 'WORKING' ? 'bg-success' :
                    selectedDaySlots.status === 'DAY_OFF' ? 'bg-danger' :
                    selectedDaySlots.status === 'MODIFIED' ? 'bg-warning' :
                    'bg-secondary'
                  }`}>
                    {selectedDaySlots.status?.replace('_', ' ')}
                  </span>
                </h6>
              </div>
              <div className="card-body">
                {selectedDaySlots.slots && selectedDaySlots.slots.length > 0 ? (
                  <div className="row g-2">
                    {selectedDaySlots.slots.map((slot, idx) => (
                      <div key={idx} className="col-6 col-md-4 col-lg-3">
                        <div className={`p-2 rounded text-center border ${
                          slot.status === 'BOOKED' ? 'bg-primary bg-opacity-10 border-primary' :
                          slot.status === 'HELD' ? 'bg-warning bg-opacity-10 border-warning' :
                          'bg-success bg-opacity-10 border-success'
                        }`}>
                          <div className="fw-bold small">
                            {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                          </div>
                          <div className="small text-muted">
                            {slot.status === 'BOOKED' && slot.patientName ? (
                              <span className="text-primary">{slot.patientName}</span>
                            ) : (
                              slot.status
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted mb-0">No slots for this day</p>
                )}

                <div className="mt-3">
                  <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => onCreateException(selectedDate)}
                  >
                    <span className="material-symbols-outlined me-1" style={{ fontSize: '16px', verticalAlign: 'middle' }}>
                      add
                    </span>
                    Add Exception for this day
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="col-lg-4">
          {/* Legend */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-light">
              <h6 className="mb-0">Legend</h6>
            </div>
            <div className="card-body">
              <div className="d-flex align-items-center mb-2">
                <span className="legend-dot bg-success me-2"></span>
                Working (Available)
              </div>
              <div className="d-flex align-items-center mb-2">
                <span className="legend-dot bg-danger me-2"></span>
                Day Off
              </div>
              <div className="d-flex align-items-center mb-2">
                <span className="legend-dot bg-warning me-2"></span>
                Modified Hours
              </div>
              <div className="d-flex align-items-center">
                <span className="legend-dot bg-secondary me-2"></span>
                No Schedule
              </div>
            </div>
          </div>

          {/* Upcoming Exceptions */}
          <div className="card shadow-sm">
            <div className="card-header bg-light d-flex justify-content-between align-items-center">
              <h6 className="mb-0">Upcoming Exceptions</h6>
              <span className="badge bg-secondary">{upcomingExceptions.length}</span>
            </div>
            <div className="card-body">
              {upcomingExceptions.length === 0 ? (
                <p className="text-muted mb-0">No upcoming exceptions</p>
              ) : (
                upcomingExceptions.map(ex => (
                  <div key={ex.exceptionId} className="exception-item mb-3 p-3 border rounded">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <strong>{new Date(ex.exceptionDate).toLocaleDateString()}</strong>
                        <span className={`badge ms-2 ${
                          ex.exceptionType === 'DayOff' ? 'bg-danger' :
                          ex.exceptionType === 'Modified' ? 'bg-warning' :
                          'bg-info'
                        }`}>
                          {ex.exceptionType}
                        </span>
                      </div>
                      {!ex.isAdminCreated && (
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDeleteException(ex.exceptionId)}
                          disabled={deletingId === ex.exceptionId}
                          title="Delete exception"
                        >
                          {deletingId === ex.exceptionId ? (
                            <span className="spinner-border spinner-border-sm" />
                          ) : (
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                          )}
                        </button>
                      )}
                    </div>
                    <div className="small text-muted mt-1">
                      {ex.reason}
                      {ex.isAdminCreated && (
                        <span className="badge bg-secondary ms-2">Admin Created</span>
                      )}
                    </div>
                    {ex.startTime && ex.endTime && (
                      <div className="small mt-1">
                        <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle' }}>
                          schedule
                        </span>
                        {' '}{formatTime(ex.startTime)} - {formatTime(ex.endTime)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleCalendarView;
