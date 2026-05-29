import React, { useState, useEffect, useMemo } from "react";
import NavbarAdmin from "./NavbarAdmin";
import { doctorsApi, scheduleApi } from "../../../api/adminApi";
import Toast from "./Toast";
import useToast from "../useToast";
import { getAvatarUrl } from "../../../utils/avatarHelper";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../Css/Admin.css";

export default function DoctorScheduleManagement() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  // Doctor selection
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [doctorSchedule, setDoctorSchedule] = useState(null);
  const [loading, setLoading] = useState(false);
  const [doctorsLoading, setDoctorsLoading] = useState(true);

  // Calendar state
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Exception modal
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [exceptionForm, setExceptionForm] = useState({
    exceptionDate: '',
    exceptionType: 'DayOff',
    startTime: '',
    endTime: '',
    reason: '',
    recurring: false,
    recurringUntil: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Day names for schedule display
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Fetch doctors list
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setDoctorsLoading(true);
        const response = await doctorsApi.getAll({ pageSize: 100, status: 'Active' });
        setDoctors(response.doctors || []);
      } catch (err) {
        console.error('Error fetching doctors:', err);
        showToast({ title: 'Error', message: 'Failed to load doctors list', type: 'error' });
      } finally {
        setDoctorsLoading(false);
      }
    };
    fetchDoctors();
  }, []);

  // Fetch schedule when doctor selected
  useEffect(() => {
    if (selectedDoctorId) {
      fetchDoctorSchedule();
    } else {
      setDoctorSchedule(null);
    }
  }, [selectedDoctorId]);

  const fetchDoctorSchedule = async () => {
    try {
      setLoading(true);
      const data = await scheduleApi.getDoctorSchedule(selectedDoctorId);
      setDoctorSchedule(data);
    } catch (err) {
      console.error('Error fetching schedule:', err);
      showToast({ title: 'Error', message: 'Failed to load schedule', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Calendar helpers
  const getCalendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const days = [];

    // Previous month days
    const prevMonth = new Date(year, month, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month - 1, prevMonthDays - i), isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }

    // Next month days
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }

    return days;
  }, [calendarDate]);

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const formatDateStr = (date) => {
    const pad = (value) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };

  const getExceptionForDate = (date) => {
    if (!doctorSchedule?.exceptions) return null;
    const dateStr = formatDateStr(date);
    return doctorSchedule.exceptions.find(e => e.exceptionDate === dateStr);
  };

  const getScheduleForDay = (dayOfWeek) => {
    if (!doctorSchedule?.schedules) return [];
    return doctorSchedule.schedules.filter(s => s.dayOfWeek === dayOfWeek && s.available);
  };

  const navigateCalendar = (direction) => {
    setCalendarDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  // Handle exception form
  const handleOpenExceptionModal = (date = null) => {
    setExceptionForm({
      exceptionDate: date ? formatDateStr(date) : '',
      exceptionType: 'DayOff',
      startTime: '',
      endTime: '',
      reason: '',
      recurring: false,
      recurringUntil: ''
    });
    setShowExceptionModal(true);
  };

  const handleExceptionFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setExceptionForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCreateException = async (e) => {
    e.preventDefault();
    if (!selectedDoctorId) {
      showToast({ title: 'Error', message: 'Please select a doctor', type: 'error' });
      return;
    }

    try {
      setSubmitting(true);
      await scheduleApi.createException({
        doctorId: selectedDoctorId,
        ...exceptionForm
      });
      showToast({ title: 'Success', message: 'Schedule exception created successfully', type: 'success' });
      setShowExceptionModal(false);
      fetchDoctorSchedule();
    } catch (err) {
      console.error('Error creating exception:', err);
      showToast({ title: 'Error', message: err.response?.data?.message || 'Failed to create exception', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteException = async (exceptionId) => {
    if (!window.confirm('Are you sure you want to delete this exception?')) return;

    try {
      await scheduleApi.deleteException(exceptionId);
      showToast({ title: 'Success', message: 'Exception deleted successfully', type: 'success' });
      fetchDoctorSchedule();
    } catch (err) {
      console.error('Error deleting exception:', err);
      showToast({ title: 'Error', message: 'Failed to delete exception', type: 'error' });
    }
  };

  // Render calendar day cell
  const renderDayCell = (dayInfo) => {
    const { date, isCurrentMonth } = dayInfo;
    const dayOfWeek = date.getDay();
    const schedules = getScheduleForDay(dayOfWeek);
    const exception = getExceptionForDate(date);
    const isPast = date < new Date().setHours(0,0,0,0);

    return (
      <div
        key={date.toISOString()}
        className={`calendar-day p-2 border ${!isCurrentMonth ? 'bg-light text-muted' : ''} ${isToday(date) ? 'border-primary border-2' : ''}`}
        style={{ minHeight: '100px', cursor: isCurrentMonth ? 'pointer' : 'default' }}
        onClick={() => isCurrentMonth && !isPast && handleOpenExceptionModal(date)}
      >
        <div className="d-flex justify-content-between align-items-start">
          <span className={`fw-bold ${isToday(date) ? 'text-primary' : ''}`}>
            {date.getDate()}
          </span>
          {exception && (
            <span
              className={`badge ${exception.exceptionType === 'DayOff' ? 'bg-danger' : exception.exceptionType === 'AddSlot' ? 'bg-success' : 'bg-warning'}`}
              title={exception.reason}
              onClick={(e) => { e.stopPropagation(); handleDeleteException(exception.exceptionId); }}
              style={{ cursor: 'pointer' }}
            >
              {exception.exceptionType === 'DayOff' ? 'Off' : exception.exceptionType === 'AddSlot' ? '+Slot' : 'Modified'}
              <i className="bi bi-x ms-1"></i>
            </span>
          )}
        </div>

        {isCurrentMonth && schedules.length > 0 && !exception?.exceptionType?.includes('DayOff') && (
          <div className="mt-1">
            {schedules.slice(0, 2).map((s, idx) => (
              <small key={idx} className="d-block text-muted" style={{ fontSize: '0.7rem' }}>
                {s.startTime?.slice(0,5)} - {s.endTime?.slice(0,5)}
              </small>
            ))}
            {schedules.length > 2 && (
              <small className="text-muted">+{schedules.length - 2} more</small>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <NavbarAdmin
      sidebarCollapsed={sidebarCollapsed}
      onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
    >
      <Toast title={toast.title} message={toast.message} type={toast.type} show={toast.show} onClose={hideToast} />

      <div className="admin-content">
        <div className="container-fluid py-4">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="mb-1">Doctor Schedule Management</h2>
              <p className="text-muted mb-0">View and manage doctor work schedules</p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => handleOpenExceptionModal()}
              disabled={!selectedDoctorId}
            >
              <i className="bi bi-plus-lg me-2"></i>
              Create Exception
            </button>
          </div>

          {/* Doctor Selection */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-md-4">
                  <label className="form-label fw-semibold">Select Doctor</label>
                  <select
                    className="form-select"
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    disabled={doctorsLoading}
                  >
                    <option value="">-- Select a doctor --</option>
                    {doctors.map(doc => (
                      <option key={doc.doctorID} value={doc.doctorID}>
                        {doc.fullName} - {doc.specialty}
                      </option>
                    ))}
                  </select>
                </div>

                {doctorSchedule && (
                  <div className="col-md-8">
                    <div className="d-flex align-items-center">
                      {getAvatarUrl(doctorSchedule.avatarUrl) && (
                        <img
                          src={getAvatarUrl(doctorSchedule.avatarUrl)}
                          alt={doctorSchedule.doctorName}
                          className="rounded-circle me-3"
                          style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                        />
                      )}
                      <div>
                        <h5 className="mb-0">{doctorSchedule.doctorName}</h5>
                        <small className="text-muted">{doctorSchedule.specialty}</small>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {loading && (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          )}

          {/* Schedule Info */}
          {doctorSchedule && !loading && (
            <>
              {/* Weekly Schedule Summary */}
              <div className="card mb-4">
                <div className="card-header">
                  <h5 className="mb-0">Weekly Schedule</h5>
                </div>
                <div className="card-body">
                  <div className="row">
                    {dayNames.map((dayName, idx) => {
                      const schedules = getScheduleForDay(idx);
                      return (
                        <div key={idx} className="col-md-3 col-lg mb-3">
                          <div className={`p-2 rounded ${schedules.length > 0 ? 'bg-success bg-opacity-10 border border-success' : 'bg-light'}`}>
                            <div className="fw-semibold">{dayName}</div>
                            {schedules.length > 0 ? (
                              schedules.map((s, i) => (
                                <small key={i} className="d-block text-success">
                                  {s.startTime?.slice(0,5)} - {s.endTime?.slice(0,5)}
                                  {s.consultationType && ` (${s.consultationType})`}
                                </small>
                              ))
                            ) : (
                              <small className="text-muted">Not working</small>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Calendar View */}
              <div className="card">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Monthly Calendar</h5>
                  <div className="d-flex align-items-center gap-2">
                    <button className="btn btn-outline-secondary btn-sm" onClick={() => navigateCalendar(-1)}>
                      <i className="bi bi-chevron-left"></i>
                    </button>
                    <span className="fw-semibold" style={{ minWidth: '150px', textAlign: 'center' }}>
                      {calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                    <button className="btn btn-outline-secondary btn-sm" onClick={() => navigateCalendar(1)}>
                      <i className="bi bi-chevron-right"></i>
                    </button>
                    <button className="btn btn-outline-primary btn-sm ms-2" onClick={() => setCalendarDate(new Date())}>
                      Today
                    </button>
                  </div>
                </div>
                <div className="card-body p-0">
                  {/* Calendar Header */}
                  <div className="d-grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-center py-2 bg-light border fw-semibold">
                        {day}
                      </div>
                    ))}
                  </div>
                  {/* Calendar Days */}
                  <div className="d-grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
                    {getCalendarDays.map(renderDayCell)}
                  </div>
                </div>
              </div>

              {/* Exceptions List */}
              {doctorSchedule.exceptions?.length > 0 && (
                <div className="card mt-4">
                  <div className="card-header">
                    <h5 className="mb-0">Exceptions List</h5>
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Time</th>
                            <th>Reason</th>
                            <th>Source</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {doctorSchedule.exceptions.map(exc => (
                            <tr key={exc.exceptionId}>
                              <td>{new Date(exc.exceptionDate).toLocaleDateString('en-US')}</td>
                              <td>
                                <span className={`badge ${exc.exceptionType === 'DayOff' ? 'bg-danger' : exc.exceptionType === 'AddSlot' ? 'bg-success' : 'bg-warning'}`}>
                                  {exc.exceptionType === 'DayOff' ? 'Day Off' : exc.exceptionType === 'AddSlot' ? 'Add Slot' : 'Modified'}
                                </span>
                              </td>
                              <td>
                                {exc.startTime && exc.endTime
                                  ? `${exc.startTime.slice(0,5)} - ${exc.endTime.slice(0,5)}`
                                  : 'All Day'}
                              </td>
                              <td>{exc.reason?.replace('[Admin] ', '')}</td>
                              <td>
                                {exc.isAdminCreated ? (
                                  <span className="badge bg-info">Admin</span>
                                ) : (
                                  <span className="badge bg-secondary">Doctor</span>
                                )}
                              </td>
                              <td>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleDeleteException(exc.exceptionId)}
                                >
                                  <i className="bi bi-trash"></i>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {!selectedDoctorId && !loading && (
            <div className="text-center py-5">
              <i className="bi bi-calendar3 display-1 text-muted"></i>
              <p className="text-muted mt-3">Please select a doctor to view their schedule</p>
            </div>
          )}
        </div>
      </div>

      {/* Exception Modal */}
      {showExceptionModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Create Schedule Exception</h5>
                <button type="button" className="btn-close" onClick={() => setShowExceptionModal(false)}></button>
              </div>
              <form onSubmit={handleCreateException}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Date <span className="text-danger">*</span></label>
                    <input
                      type="date"
                      className="form-control"
                      name="exceptionDate"
                      value={exceptionForm.exceptionDate}
                      onChange={handleExceptionFormChange}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Exception Type <span className="text-danger">*</span></label>
                    <select
                      className="form-select"
                      name="exceptionType"
                      value={exceptionForm.exceptionType}
                      onChange={handleExceptionFormChange}
                      required
                    >
                      <option value="DayOff">Day Off (Block entire day)</option>
                      <option value="Modified">Modified Hours</option>
                      <option value="AddSlot">Add Extra Slot</option>
                    </select>
                  </div>

                  {(exceptionForm.exceptionType === 'Modified' || exceptionForm.exceptionType === 'AddSlot') && (
                    <div className="row mb-3">
                      <div className="col-6">
                        <label className="form-label">Start Time</label>
                        <input
                          type="time"
                          className="form-control"
                          name="startTime"
                          value={exceptionForm.startTime}
                          onChange={handleExceptionFormChange}
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label">End Time</label>
                        <input
                          type="time"
                          className="form-control"
                          name="endTime"
                          value={exceptionForm.endTime}
                          onChange={handleExceptionFormChange}
                        />
                      </div>
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label">Reason <span className="text-danger">*</span></label>
                    <textarea
                      className="form-control"
                      name="reason"
                      value={exceptionForm.reason}
                      onChange={handleExceptionFormChange}
                      rows="2"
                      required
                      placeholder="Enter the reason for this exception..."
                    ></textarea>
                  </div>

                  <div className="form-check mb-3">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="recurring"
                      name="recurring"
                      checked={exceptionForm.recurring}
                      onChange={handleExceptionFormChange}
                    />
                    <label className="form-check-label" htmlFor="recurring">
                      Repeat weekly
                    </label>
                  </div>

                  {exceptionForm.recurring && (
                    <div className="mb-3">
                      <label className="form-label">Repeat until</label>
                      <input
                        type="date"
                        className="form-control"
                        name="recurringUntil"
                        value={exceptionForm.recurringUntil}
                        onChange={handleExceptionFormChange}
                      />
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowExceptionModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Creating...
                      </>
                    ) : (
                      'Create Exception'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </NavbarAdmin>
  );
}
