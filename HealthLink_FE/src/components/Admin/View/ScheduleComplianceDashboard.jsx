import React, { useState, useEffect, useMemo, useRef } from "react";
import NavbarAdmin from "./NavbarAdmin";
import { adminComplianceService } from "../../../api/complianceApi";
import { scheduleApi } from "../../../api/adminApi";
import Toast from "./Toast";
import useToast from "../useToast";
import { getAvatarUrl } from "../../../utils/avatarHelper";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../Css/Admin.css";
import "../Css/ScheduleCompliance.css";
import "../Css/DoctorSchedule.css";

export default function ScheduleComplianceDashboard() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  // Active tab: 'compliance' or 'change-requests'
  const [activeTab, setActiveTab] = useState('compliance');

  // Month selection
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');

  // Data
  const [complianceData, setComplianceData] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(20);

  // Exemption modal
  const [showExemptModal, setShowExemptModal] = useState(false);
  const [exemptDoctor, setExemptDoctor] = useState(null);
  const [exemptReason, setExemptReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Schedule detail section
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [doctorSchedule, setDoctorSchedule] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const scheduleDetailRef = useRef(null);

  // Schedule Change Requests section
  const [changeRequests, setChangeRequests] = useState([]);
  const [changeRequestsLoading, setChangeRequestsLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingRequest, setRejectingRequest] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processingRequestId, setProcessingRequestId] = useState(null);

  // Day names for schedule display
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Fetch compliance data when filters change
  useEffect(() => {
    fetchData();
    fetchChangeRequests();
  }, [selectedMonth, statusFilter, specialtyFilter, pageNumber]);

  // Fetch schedule change requests
  const fetchChangeRequests = async () => {
    try {
      setChangeRequestsLoading(true);
      const data = await scheduleApi.getScheduleChangeRequests();
      setChangeRequests(data || []);
    } catch (err) {
      console.error('Error fetching change requests:', err);
      // Silently fail - not critical
    } finally {
      setChangeRequestsLoading(false);
    }
  };

  // Approve a change request
  const handleApproveRequest = async (requestId) => {
    try {
      setProcessingRequestId(requestId);
      await scheduleApi.approveScheduleChangeRequest(requestId, 'Approved by admin');
      showToast({ title: 'Success', message: 'Change request approved', type: 'success' });
      fetchChangeRequests();
    } catch (err) {
      console.error('Error approving request:', err);
      showToast({ title: 'Error', message: err.response?.data?.message || 'Failed to approve request', type: 'error' });
    } finally {
      setProcessingRequestId(null);
    }
  };

  // Reject a change request
  const handleRejectRequest = async () => {
    if (!rejectingRequest || !rejectReason.trim()) {
      showToast({ title: 'Error', message: 'Please provide a reason for rejection', type: 'error' });
      return;
    }
    try {
      setProcessingRequestId(rejectingRequest.requestId);
      await scheduleApi.rejectScheduleChangeRequest(rejectingRequest.requestId, rejectReason.trim());
      showToast({ title: 'Success', message: 'Change request rejected', type: 'success' });
      setShowRejectModal(false);
      setRejectingRequest(null);
      setRejectReason('');
      fetchChangeRequests();
    } catch (err) {
      console.error('Error rejecting request:', err);
      showToast({ title: 'Error', message: err.response?.data?.message || 'Failed to reject request', type: 'error' });
    } finally {
      setProcessingRequestId(null);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [complianceRes, statsRes] = await Promise.all([
        adminComplianceService.getAllCompliance(selectedMonth, {
          status: statusFilter || undefined,
          specialtyId: specialtyFilter || undefined,
          pageNumber,
          pageSize,
        }),
        adminComplianceService.getStatistics(selectedMonth),
      ]);
      setComplianceData(complianceRes);
      setStatistics(statsRes);
    } catch (err) {
      console.error('Error fetching compliance data:', err);
      showToast({ title: 'Error', message: 'Failed to load compliance data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch doctor schedule when selected
  const fetchDoctorSchedule = async (doctorId) => {
    try {
      setScheduleLoading(true);
      const data = await scheduleApi.getDoctorSchedule(doctorId);
      setDoctorSchedule(data);
    } catch (err) {
      console.error('Error fetching schedule:', err);
      showToast({ title: 'Error', message: 'Failed to load schedule', type: 'error' });
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleViewSchedule = (doctor) => {
    if (selectedDoctor?.doctorId === doctor.doctorId) {
      // Toggle off if same doctor clicked
      setSelectedDoctor(null);
      setDoctorSchedule(null);
    } else {
      setSelectedDoctor(doctor);
      setCalendarDate(new Date());
      fetchDoctorSchedule(doctor.doctorId);
      // Scroll to schedule detail after a short delay
      setTimeout(() => {
        scheduleDetailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const handleCloseScheduleDetail = () => {
    setSelectedDoctor(null);
    setDoctorSchedule(null);
  };

  const handleExempt = async () => {
    if (!exemptDoctor || !exemptReason.trim()) {
      showToast({ title: 'Error', message: 'Please provide a reason for exemption', type: 'error' });
      return;
    }

    try {
      setSubmitting(true);
      await adminComplianceService.exemptDoctor(exemptDoctor.doctorId, {
        complianceMonth: selectedMonth,
        reason: exemptReason,
      });
      showToast({ title: 'Success', message: 'Doctor exempted successfully', type: 'success' });
      setShowExemptModal(false);
      setExemptDoctor(null);
      setExemptReason('');
      fetchData();
    } catch (err) {
      console.error('Error exempting doctor:', err);
      showToast({ title: 'Error', message: err.response?.data?.message || 'Failed to exempt doctor', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const formatMonth = (monthStr) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'COMPLIANT': return 'bg-success';
      case 'IN_PROGRESS': return 'bg-warning text-dark';
      case 'PENDING': return 'bg-info';
      case 'NON_COMPLIANT': return 'bg-danger';
      case 'EXEMPTED': return 'bg-secondary';
      default: return 'bg-light text-dark';
    }
  };

  const getProgressBarClass = (percentage) => {
    if (percentage >= 100) return 'bg-success';
    if (percentage >= 80) return 'bg-warning';
    if (percentage >= 50) return 'bg-info';
    return 'bg-danger';
  };

  // Generate month options
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = -6; i <= 1; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      options.push({ value, label: formatMonth(value) });
    }
    return options.reverse();
  }, []);

  // Calendar helpers
  const getCalendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const days = [];

    const prevMonth = new Date(year, month, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month - 1, prevMonthDays - i), isCurrentMonth: false });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }

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

  const renderDayCell = (dayInfo) => {
    const { date, isCurrentMonth } = dayInfo;
    const dayOfWeek = date.getDay();
    const schedules = getScheduleForDay(dayOfWeek);
    const exception = getExceptionForDate(date);

    return (
      <div
        key={date.toISOString()}
        className={`calendar-day p-2 border ${!isCurrentMonth ? 'bg-light text-muted' : ''} ${isToday(date) ? 'border-primary border-2' : ''}`}
        style={{ minHeight: '80px' }}
      >
        <div className="d-flex justify-content-between align-items-start">
          <span className={`fw-bold ${isToday(date) ? 'text-primary' : ''}`} style={{ fontSize: '12px' }}>
            {date.getDate()}
          </span>
          {exception && (
            <span
              className={`badge ${exception.exceptionType === 'DayOff' ? 'bg-danger' : exception.exceptionType === 'AddSlot' ? 'bg-success' : 'bg-warning'}`}
              title={exception.reason}
              style={{ fontSize: '9px' }}
            >
              {exception.exceptionType === 'DayOff' ? 'Off' : exception.exceptionType === 'AddSlot' ? '+Slot' : 'Mod'}
            </span>
          )}
        </div>

        {isCurrentMonth && schedules.length > 0 && !exception?.exceptionType?.includes('DayOff') && (
          <div className="mt-1">
            {schedules.slice(0, 1).map((s, idx) => (
              <small key={idx} className="d-block text-muted" style={{ fontSize: '9px' }}>
                {s.startTime?.slice(0,5)}-{s.endTime?.slice(0,5)}
              </small>
            ))}
            {schedules.length > 1 && (
              <small className="text-muted" style={{ fontSize: '9px' }}>+{schedules.length - 1}</small>
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
        <div className="container-fluid py-3">
          {/* Header */}
          <div className="compliance-page-header mb-3">
            <div className="d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <div className="compliance-page-icon">
                  <i className="bi bi-calendar-check"></i>
                </div>
                <div>
                  <h2 className="compliance-page-title">Doctor Schedules & Compliance</h2>
                  <p className="compliance-page-subtitle mb-0">Monitor schedules and compliance status</p>
                </div>
              </div>
              <select
                className="compliance-filter-select"
                style={{ width: '160px' }}
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setPageNumber(1);
                }}
              >
                {monthOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tabs */}
          <div className="compliance-tabs mb-3">
            <div className="d-flex gap-2 p-1 rounded-3" style={{ background: '#f1f5f9', display: 'inline-flex' }}>
              <button
                className={`btn btn-sm px-4 py-2 rounded-2 ${activeTab === 'compliance' ? 'btn-primary' : 'btn-link text-muted'}`}
                onClick={() => setActiveTab('compliance')}
                style={{ fontWeight: 500, textDecoration: 'none' }}
              >
                <i className="bi bi-clipboard-check me-2"></i>
                Compliance
              </button>
              <button
                className={`btn btn-sm px-4 py-2 rounded-2 ${activeTab === 'change-requests' ? 'btn-primary' : 'btn-link text-muted'}`}
                onClick={() => setActiveTab('change-requests')}
                style={{ fontWeight: 500, textDecoration: 'none', position: 'relative' }}
              >
                <i className="bi bi-arrow-repeat me-2"></i>
                Change Requests
                {changeRequests.filter(r => r.status === 'PENDING').length > 0 && (
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '10px' }}>
                    {changeRequests.filter(r => r.status === 'PENDING').length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Tab Content: Compliance */}
          {activeTab === 'compliance' && (
            <>
          {/* Statistics Cards */}
          {statistics && (
            <div className="compliance-stats-row mb-3">
              <div className="compliance-stat-card">
                <div className="compliance-stat-value">{statistics.totalDoctors}</div>
                <div className="compliance-stat-label">Total Doctors</div>
              </div>
              <div className="compliance-stat-card border-success">
                <div className="compliance-stat-value text-success">{statistics.compliantCount}</div>
                <div className="compliance-stat-label">Compliant</div>
              </div>
              <div className="compliance-stat-card border-warning">
                <div className="compliance-stat-value text-warning">{statistics.inProgressCount}</div>
                <div className="compliance-stat-label">In Progress</div>
              </div>
              <div className="compliance-stat-card border-info">
                <div className="compliance-stat-value text-info">{statistics.pendingCount}</div>
                <div className="compliance-stat-label">Pending</div>
              </div>
              <div className="compliance-stat-card border-danger">
                <div className="compliance-stat-value text-danger">{statistics.nonCompliantCount}</div>
                <div className="compliance-stat-label">Non-Compliant</div>
              </div>
              <div className="compliance-stat-card border-secondary">
                <div className="compliance-stat-value text-secondary">{statistics.exemptedCount}</div>
                <div className="compliance-stat-label">Exempted</div>
              </div>
            </div>
          )}

          {/* Compliance Rate Card */}
          {statistics && (
            <div className="compliance-rate-card mb-3">
              <div className="compliance-rate-header">
                <h6 className="compliance-rate-title">Overall Compliance Rate</h6>
                <span className="compliance-rate-badge">{statistics.compliantPercentage?.toFixed(1)}%</span>
              </div>
              <div className="compliance-progress">
                <div
                  className={`compliance-progress-bar ${getProgressBarClass(statistics.compliantPercentage || 0)}`}
                  style={{ width: `${statistics.compliantPercentage || 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="compliance-filter-card mb-3">
            <div className="compliance-filter-row">
              <div className="compliance-filter-group">
                <label className="compliance-filter-label">Status Filter</label>
                <select
                  className="compliance-filter-select"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPageNumber(1);
                  }}
                >
                  <option value="">All Statuses</option>
                  <option value="COMPLIANT">Compliant</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="PENDING">Pending</option>
                  <option value="NON_COMPLIANT">Non-Compliant</option>
                  <option value="EXEMPTED">Exempted</option>
                </select>
              </div>
              <button
                className="compliance-btn outline"
                onClick={() => {
                  setStatusFilter('');
                  setSpecialtyFilter('');
                  setPageNumber(1);
                }}
              >
                <i className="bi bi-x-circle"></i>
                Clear
              </button>
              <div style={{ marginLeft: 'auto' }}>
                <button className="compliance-btn primary" onClick={fetchData}>
                  <i className="bi bi-arrow-clockwise"></i>
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Doctors Table */}
          <div className="compliance-table-card">
            {loading ? (
              <div className="compliance-empty">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : complianceData?.data?.length > 0 ? (
              <div className="table-responsive">
                <table className="compliance-table">
                  <thead>
                    <tr>
                      <th>Doctor</th>
                      <th>Specialty</th>
                      <th>Hours</th>
                      <th>Progress</th>
                      <th>Status</th>
                      <th>Schedule</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {complianceData.data.map((item) => (
                      <tr
                        key={item.complianceId || item.doctorId}
                        className={selectedDoctor?.doctorId === item.doctorId ? 'table-active' : ''}
                      >
                        <td>
                          <div className="compliance-doctor-info">
                            <img
                              src={getAvatarUrl(item.avatarUrl) || '/default-avatar.png'}
                              alt={item.doctorName}
                              className="compliance-doctor-avatar"
                              onError={(e) => { e.target.src = '/default-avatar.png'; }}
                            />
                            <div>
                              <div className="compliance-doctor-name">{item.doctorName}</div>
                              <div className="compliance-doctor-id">{item.doctorId?.slice(0, 8)}...</div>
                            </div>
                          </div>
                        </td>
                        <td>{item.specialty || '-'}</td>
                        <td>
                          <span className="compliance-hours">
                            <span className="compliance-hours-value">{item.scheduledHours}</span>
                            <span className="compliance-hours-total"> / {item.requiredHours}</span>
                          </span>
                        </td>
                        <td className="compliance-progress-cell">
                          <div className="compliance-progress-wrapper">
                            <div className="compliance-mini-progress">
                              <div
                                className={`compliance-mini-bar ${getProgressBarClass(item.compliancePercentage)}`}
                                style={{ width: `${Math.min(item.compliancePercentage, 100)}%` }}
                              />
                            </div>
                            <span className="compliance-percent">{item.compliancePercentage?.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td>
                          <span className={`compliance-badge ${item.status === 'COMPLIANT' ? 'success' : item.status === 'IN_PROGRESS' ? 'warning' : item.status === 'PENDING' ? 'info' : item.status === 'NON_COMPLIANT' ? 'danger' : 'secondary'}`}>
                            {item.statusDisplay}
                          </span>
                        </td>
                        <td>
                          <span className={`compliance-badge ${item.scheduleActive ? 'success' : 'danger'}`}>
                            {item.scheduleActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <button
                              className={`compliance-action-btn ${selectedDoctor?.doctorId === item.doctorId ? 'active' : ''}`}
                              onClick={() => handleViewSchedule(item)}
                              title="View Schedule"
                            >
                              <i className="bi bi-calendar3"></i>
                              {selectedDoctor?.doctorId === item.doctorId ? 'Hide' : 'View'}
                            </button>
                            {item.status !== 'EXEMPTED' && item.status !== 'COMPLIANT' && (
                              <button
                                className="compliance-action-btn"
                                onClick={() => {
                                  setExemptDoctor(item);
                                  setShowExemptModal(true);
                                }}
                                title="Exempt"
                              >
                                <i className="bi bi-shield-check"></i>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="compliance-empty">
                <i className="bi bi-inbox compliance-empty-icon"></i>
                <p className="compliance-empty-text">No compliance records found for this period</p>
              </div>
            )}

            {/* Pagination */}
            {complianceData && complianceData.totalPages > 1 && (
              <div className="compliance-pagination">
                <span className="compliance-pagination-info">
                  Showing {((pageNumber - 1) * pageSize) + 1} to {Math.min(pageNumber * pageSize, complianceData.totalElements)} of {complianceData.totalElements}
                </span>
                <div className="compliance-pagination-controls">
                  <button className="compliance-page-btn" onClick={() => setPageNumber(p => p - 1)} disabled={!complianceData.hasPrevious}>
                    Previous
                  </button>
                  <button className="compliance-page-btn active">{pageNumber}</button>
                  <button className="compliance-page-btn" onClick={() => setPageNumber(p => p + 1)} disabled={!complianceData.hasNext}>
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Schedule Detail Section */}
          {selectedDoctor && (
            <div ref={scheduleDetailRef} className="schedule-detail-section mt-4">
              <div className="schedule-detail-header">
                <div className="d-flex align-items-center gap-3">
                  <img
                    src={getAvatarUrl(selectedDoctor.avatarUrl) || '/default-avatar.png'}
                    alt={selectedDoctor.doctorName}
                    className="schedule-detail-avatar"
                    onError={(e) => { e.target.src = '/default-avatar.png'; }}
                  />
                  <div>
                    <h5 className="schedule-detail-name">{selectedDoctor.doctorName}</h5>
                    <span className="schedule-detail-specialty">{selectedDoctor.specialty}</span>
                  </div>
                </div>
                <button className="schedule-detail-close" onClick={handleCloseScheduleDetail}>
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>

              {scheduleLoading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : doctorSchedule ? (
                <div className="schedule-detail-content">
                  <div className="row">
                    {/* Weekly Schedule */}
                    <div className="col-lg-4 mb-3">
                      <div className="schedule-weekly-card">
                        <div className="schedule-card-header">
                          <h6 className="schedule-card-title mb-0">Weekly Schedule</h6>
                        </div>
                        <div className="schedule-card-body">
                          <div className="schedule-weekly-grid-compact">
                            {dayNames.map((dayName, idx) => {
                              const schedules = getScheduleForDay(idx);
                              return (
                                <div key={idx} className={`schedule-day-item-compact ${schedules.length > 0 ? 'active' : 'inactive'}`}>
                                  <div className="schedule-day-name-compact">{dayName.slice(0,3)}</div>
                                  {schedules.length > 0 ? (
                                    schedules.slice(0, 2).map((s, i) => (
                                      <div key={i} className="schedule-day-time-compact">
                                        {s.startTime?.slice(0,5)}-{s.endTime?.slice(0,5)}
                                      </div>
                                    ))
                                  ) : (
                                    <div className="schedule-day-off-compact">Off</div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Exceptions List */}
                      {doctorSchedule.exceptions?.length > 0 && (
                        <div className="schedule-exceptions-card-compact mt-3">
                          <div className="schedule-card-header">
                            <h6 className="schedule-card-title mb-0">
                              Exceptions
                              <span className="badge bg-secondary ms-2">{doctorSchedule.exceptions.length}</span>
                            </h6>
                          </div>
                          <div className="schedule-exceptions-list">
                            {doctorSchedule.exceptions.slice(0, 5).map(exc => (
                              <div key={exc.exceptionId} className="schedule-exception-item">
                                <div className="d-flex justify-content-between align-items-center">
                                  <span className="schedule-exception-date">
                                    {new Date(exc.exceptionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </span>
                                  <span className={`badge ${exc.exceptionType === 'DayOff' ? 'bg-danger' : exc.exceptionType === 'AddSlot' ? 'bg-success' : 'bg-warning'}`} style={{ fontSize: '10px' }}>
                                    {exc.exceptionType === 'DayOff' ? 'Day Off' : exc.exceptionType === 'AddSlot' ? 'Add Slot' : 'Modified'}
                                  </span>
                                </div>
                                <small className="text-muted">{exc.reason?.replace('[Admin] ', '').slice(0, 30)}...</small>
                              </div>
                            ))}
                            {doctorSchedule.exceptions.length > 5 && (
                              <div className="text-center text-muted small py-2">
                                +{doctorSchedule.exceptions.length - 5} more exceptions
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Monthly Calendar */}
                    <div className="col-lg-8 mb-3">
                      <div className="schedule-calendar-card-compact">
                        <div className="schedule-calendar-header-compact">
                          <h6 className="schedule-card-title mb-0">Monthly Calendar</h6>
                          <div className="schedule-calendar-nav-compact">
                            <button className="schedule-nav-btn-compact" onClick={() => navigateCalendar(-1)}>
                              <i className="bi bi-chevron-left"></i>
                            </button>
                            <span className="schedule-month-label-compact">
                              {calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </span>
                            <button className="schedule-nav-btn-compact" onClick={() => navigateCalendar(1)}>
                              <i className="bi bi-chevron-right"></i>
                            </button>
                            <button className="schedule-today-btn-compact" onClick={() => setCalendarDate(new Date())}>
                              Today
                            </button>
                          </div>
                        </div>
                        <div className="schedule-calendar-grid-compact">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="schedule-weekday-compact">{day}</div>
                          ))}
                          {getCalendarDays.map(renderDayCell)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-5 text-muted">
                  <i className="bi bi-calendar-x" style={{ fontSize: '48px' }}></i>
                  <p className="mt-2">No schedule data available</p>
                </div>
              )}
            </div>
          )}
            </>
          )}

          {/* Tab Content: Change Requests */}
          {activeTab === 'change-requests' && (
            <div className="change-requests-section">
              <div className="compliance-filter-card mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <span className="text-muted small">
                      {changeRequests.filter(r => r.status === 'PENDING').length} pending requests
                    </span>
                  </div>
                  <button
                    className="compliance-btn primary"
                    onClick={fetchChangeRequests}
                    disabled={changeRequestsLoading}
                  >
                    <i className="bi bi-arrow-clockwise"></i>
                    Refresh
                  </button>
                </div>
              </div>

              <div className="compliance-table-card">
                {changeRequestsLoading ? (
                  <div className="compliance-empty">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : changeRequests.length > 0 ? (
                  <div className="table-responsive">
                    <table className="compliance-table">
                      <thead>
                        <tr>
                          <th>Request ID</th>
                          <th>Doctor / Patient</th>
                          <th>Appointment</th>
                          <th>Reason</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {changeRequests.map((request) => (
                          <tr key={request.requestId}>
                            <td>
                              <span className="fw-semibold">#{request.requestId}</span>
                            </td>
                            <td>
                              <div className="fw-semibold">{request.doctorName}</div>
                              <div className="text-muted small">{request.patientName}</div>
                            </td>
                            <td>
                              <div>
                                {request.appointmentTime ?
                                  new Date(request.appointmentTime).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) : 'N/A'}
                              </div>
                              <div className="text-muted small">#{request.appointmentId}</div>
                            </td>
                            <td style={{ maxWidth: '220px' }}>
                              <div className="text-break small">{request.reason}</div>
                            </td>
                            <td>
                              <span className={`compliance-badge ${
                                request.status === 'APPROVED' ? 'success' :
                                request.status === 'REJECTED' ? 'danger' : 'warning'
                              }`}>
                                {request.status}
                              </span>
                              {request.adminReason && (
                                <div className="text-muted small mt-1">{request.adminReason}</div>
                              )}
                            </td>
                            <td>
                              {request.status === 'PENDING' ? (
                                <div className="d-flex gap-1">
                                  <button
                                    className="compliance-action-btn"
                                    style={{ color: '#16a34a' }}
                                    onClick={() => handleApproveRequest(request.requestId)}
                                    disabled={processingRequestId === request.requestId}
                                    title="Approve"
                                  >
                                    <i className="bi bi-check-circle"></i>
                                    Approve
                                  </button>
                                  <button
                                    className="compliance-action-btn"
                                    style={{ color: '#dc2626' }}
                                    onClick={() => {
                                      setRejectingRequest(request);
                                      setShowRejectModal(true);
                                    }}
                                    disabled={processingRequestId === request.requestId}
                                    title="Reject"
                                  >
                                    <i className="bi bi-x-circle"></i>
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <span className="text-muted small">Processed</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="compliance-empty">
                    <i className="bi bi-inbox compliance-empty-icon"></i>
                    <p className="compliance-empty-text">No schedule change requests found</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reject Change Request Modal */}
      {showRejectModal && rejectingRequest && (
        <div className="compliance-modal-overlay">
          <div className="compliance-modal">
            <div className="compliance-modal-header">
              <h5 className="compliance-modal-title">Reject Schedule Change Request</h5>
              <button className="compliance-modal-close" onClick={() => {
                setShowRejectModal(false);
                setRejectingRequest(null);
                setRejectReason('');
              }}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="compliance-modal-body">
              <div className="mb-3 p-3 rounded" style={{ background: '#f8fafc' }}>
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <div className="fw-bold">{rejectingRequest.doctorName}</div>
                    <div className="text-muted small">Patient: {rejectingRequest.patientName}</div>
                    <div className="text-muted small">
                      Appointment: {rejectingRequest.appointmentTime ?
                        new Date(rejectingRequest.appointmentTime).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                  <span className="badge bg-warning text-dark">#{rejectingRequest.requestId}</span>
                </div>
                <div className="mt-2 pt-2 border-top">
                  <small className="text-muted">Doctor's reason:</small>
                  <div>{rejectingRequest.reason}</div>
                </div>
              </div>
              <div className="compliance-form-group">
                <label className="compliance-form-label">Reason for Rejection *</label>
                <textarea
                  className="compliance-form-textarea"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explain why the request is being rejected..."
                  required
                  rows={3}
                />
              </div>
            </div>
            <div className="compliance-modal-footer">
              <button
                className="compliance-modal-btn secondary"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectingRequest(null);
                  setRejectReason('');
                }}
              >
                Cancel
              </button>
              <button
                className="compliance-modal-btn"
                style={{ background: '#dc2626', color: '#fff' }}
                onClick={handleRejectRequest}
                disabled={processingRequestId || !rejectReason.trim()}
              >
                {processingRequestId ? (
                  <>
                    <span className="spinner-border spinner-border-sm"></span>
                    Processing...
                  </>
                ) : (
                  <>
                    <i className="bi bi-x-circle"></i>
                    Reject Request
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exemption Modal */}
      {showExemptModal && (
        <div className="compliance-modal-overlay">
          <div className="compliance-modal">
            <div className="compliance-modal-header">
              <h5 className="compliance-modal-title">Exempt Doctor from Compliance</h5>
              <button className="compliance-modal-close" onClick={() => {
                setShowExemptModal(false);
                setExemptDoctor(null);
                setExemptReason('');
              }}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="compliance-modal-body">
              {exemptDoctor && (
                <div>
                  <p style={{ fontSize: '12px', marginBottom: '10px' }}>
                    Exempting <strong>{exemptDoctor.doctorName}</strong> from schedule compliance requirement for <strong>{formatMonth(selectedMonth)}</strong>.
                  </p>
                  <div className="compliance-modal-alert warning">
                    <i className="bi bi-exclamation-triangle me-1"></i>
                    This will mark the doctor's schedule as active regardless of hours scheduled.
                  </div>
                </div>
              )}
              <div className="compliance-form-group">
                <label className="compliance-form-label">Reason for Exemption *</label>
                <textarea
                  className="compliance-form-textarea"
                  value={exemptReason}
                  onChange={(e) => setExemptReason(e.target.value)}
                  placeholder="Provide a detailed reason (minimum 10 characters)"
                  required
                />
                <span className="compliance-form-hint">{exemptReason.length}/500 characters</span>
              </div>
            </div>
            <div className="compliance-modal-footer">
              <button
                className="compliance-modal-btn secondary"
                onClick={() => {
                  setShowExemptModal(false);
                  setExemptDoctor(null);
                  setExemptReason('');
                }}
              >
                Cancel
              </button>
              <button
                className="compliance-modal-btn primary"
                onClick={handleExempt}
                disabled={submitting || exemptReason.trim().length < 10}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm"></span>
                    Processing...
                  </>
                ) : (
                  <>
                    <i className="bi bi-shield-check"></i>
                    Confirm
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </NavbarAdmin>
  );
}
