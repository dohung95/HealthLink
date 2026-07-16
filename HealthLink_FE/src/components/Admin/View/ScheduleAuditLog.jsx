import React, { useState, useEffect } from "react";
import NavbarAdmin from "./NavbarAdmin";
import { scheduleApi, doctorsApi, auditApi } from "../../../api/adminApi";
import Toast from "./Toast";
import useToast from "../useToast";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../Css/Admin.css";
import "../Css/AuditLog.css";

const SOURCE_LABELS = { all: 'All Logs', schedule: 'Schedule', admin: 'Admin Actions' };

// Flat value -> label map covering every action type across all categories/sources,
// used to describe the applied filters (e.g. in the Export summary) regardless of
// which tab is currently active.
const ACTION_TYPE_LABELS = {
  CANCEL_APPOINTMENT: 'Cancel Appointment',
  REASSIGN_APPOINTMENT: 'Reassign Appointment',
  USER_STATUS_CHANGED: 'Status Changed',
  PAYPAL_EMAIL_CHANGED: 'PayPal Email Changed',
  REGISTRATION_APPROVED: 'Approved',
  REGISTRATION_REJECTED: 'Rejected',
  AI_REJECTED: 'AI Rejected',
  COMMISSION_CONFIG_CHANGED: 'Config Changed',
  COMMISSION_PARTNER_CHANGED: 'Partner Rate Changed',
  COMMISSION_PARTNER_RESET: 'Partner Rate Reset'
};

export default function ScheduleAuditLog() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  // Data state
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    pageNumber: 1,
    pageSize: 20,
    totalPages: 0,
    totalElements: 0
  });

  // Filter state (draft values bound to the filter inputs)
  const emptyFilters = {
    category: '',
    doctorId: '',
    actionType: '',
    startDate: '',
    endDate: ''
  };
  const [filters, setFilters] = useState(emptyFilters);

  // Filters actually applied to the query — only changes on Apply/Reset/tab switch,
  // so the fetch effect always sees a consistent snapshot instead of a stale closure.
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);

  // Active tab for log source
  const [activeSource, setActiveSource] = useState('all'); // 'all', 'schedule', 'admin'

  // Doctors list for filter
  const [doctors, setDoctors] = useState([]);

  // Detail modal state
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('CSV');
  const [exporting, setExporting] = useState(false);

  // Categories
  const categories = [
    { value: '', label: 'All Categories' },
    { value: 'USER', label: 'User Management' },
    { value: 'REGISTRATION', label: 'Registration' },
    { value: 'COMMISSION', label: 'Commission' }
  ];

  // Action types based on category
  const getActionTypes = (category) => {
    const scheduleActions = [
      { value: 'CANCEL_APPOINTMENT', label: 'Cancel Appointment' },
      { value: 'REASSIGN_APPOINTMENT', label: 'Reassign Appointment' }
    ];

    const userActions = [
      { value: 'USER_STATUS_CHANGED', label: 'Status Changed' },
      { value: 'PAYPAL_EMAIL_CHANGED', label: 'PayPal Email Changed' }
    ];

    const registrationActions = [
      { value: 'REGISTRATION_APPROVED', label: 'Approved' },
      { value: 'REGISTRATION_REJECTED', label: 'Rejected' },
      { value: 'AI_REJECTED', label: 'AI Rejected' }
    ];

    const commissionActions = [
      { value: 'COMMISSION_CONFIG_CHANGED', label: 'Config Changed' },
      { value: 'COMMISSION_PARTNER_CHANGED', label: 'Partner Rate Changed' },
      { value: 'COMMISSION_PARTNER_RESET', label: 'Partner Rate Reset' }
    ];

    let actions = [{ value: '', label: 'All Actions' }];

    if (activeSource === 'schedule') {
      actions = [...actions, ...scheduleActions];
    } else if (activeSource === 'admin') {
      if (!category || category === 'USER') actions = [...actions, ...userActions];
      if (!category || category === 'REGISTRATION') actions = [...actions, ...registrationActions];
      if (!category || category === 'COMMISSION') actions = [...actions, ...commissionActions];
    } else {
      // all - show all action types
      actions = [...actions, ...scheduleActions, ...userActions, ...registrationActions, ...commissionActions];
    }

    return actions;
  };

  const actionTypes = getActionTypes(filters.category);

  // Fetch doctors for filter
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const response = await doctorsApi.getAll({ pageSize: 100 });
        setDoctors(response.doctors || []);
      } catch (err) {
        console.error('Error fetching doctors:', err);
      }
    };
    fetchDoctors();
  }, []);

  // Fetch audit logs — re-runs whenever pagination, source or the *applied* filters change.
  useEffect(() => {
    fetchAuditLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.pageNumber, pagination.pageSize, activeSource, appliedFilters]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);

      if (activeSource === 'schedule') {
        // Fetch only schedule audit logs
        const params = {
          pageNumber: pagination.pageNumber,
          pageSize: pagination.pageSize,
          doctorId: appliedFilters.doctorId || undefined,
          actionType: appliedFilters.actionType || undefined,
          startTime: appliedFilters.startDate ? `${appliedFilters.startDate}T00:00:00` : undefined,
          endTime: appliedFilters.endDate ? `${appliedFilters.endDate}T23:59:59` : undefined
        };

        const response = await scheduleApi.getAuditLogs(params);
        const scheduleLogs = (response.logs || []).map(log => ({ ...log, source: 'schedule' }));
        setLogs(scheduleLogs);
        setPagination(prev => ({
          ...prev,
          totalPages: response.totalPages || 0,
          totalElements: response.totalElements || 0
        }));
      } else if (activeSource === 'admin') {
        // Fetch only admin audit logs
        const params = {
          pageNumber: pagination.pageNumber,
          pageSize: pagination.pageSize,
          category: appliedFilters.category || undefined,
          actionType: appliedFilters.actionType || undefined,
          startTime: appliedFilters.startDate ? `${appliedFilters.startDate}T00:00:00` : undefined,
          endTime: appliedFilters.endDate ? `${appliedFilters.endDate}T23:59:59` : undefined
        };

        try {
          const response = await auditApi.getLogs(params);
          console.log('Admin audit logs response:', response);
          const adminLogs = (response.logs || []).map(log => ({ ...log, source: 'admin' }));
          setLogs(adminLogs);
          setPagination(prev => ({
            ...prev,
            totalPages: response.totalPages || 0,
            totalElements: response.totalElements || 0
          }));
        } catch (adminErr) {
          console.error('Admin audit API error:', adminErr);
          setLogs([]);
          setPagination(prev => ({ ...prev, totalPages: 0, totalElements: 0 }));
        }
      } else {
        // Fetch both and merge (for 'all' tab).
        // The two sources are paginated independently by the backend, so we can't
        // just ask each for "page N" — page N of the merged, date-sorted result
        // doesn't line up with page N of either source individually. Instead we
        // fetch the top-K newest rows (K = pageNumber * pageSize) from BOTH
        // sources, merge + sort them, then slice out the exact window for the
        // requested page. This guarantees the merged page is correct regardless
        // of how the matching rows are distributed between the two sources.
        const topK = pagination.pageNumber * pagination.pageSize;
        const emptySourceResult = { logs: [], totalElements: 0, totalPages: 0 };

        // Schedule logs (cancel/reassign appointment) don't belong to any Category —
        // so if a Category filter is active, they can never match it and must be
        // excluded entirely, not merged in unfiltered.
        const categoryFilterActive = !!appliedFilters.category;

        const scheduleParams = {
          pageNumber: 1,
          pageSize: topK,
          doctorId: appliedFilters.doctorId || undefined,
          actionType: appliedFilters.actionType || undefined,
          startTime: appliedFilters.startDate ? `${appliedFilters.startDate}T00:00:00` : undefined,
          endTime: appliedFilters.endDate ? `${appliedFilters.endDate}T23:59:59` : undefined
        };

        const adminParams = {
          pageNumber: 1,
          pageSize: topK,
          category: appliedFilters.category || undefined,
          actionType: appliedFilters.actionType || undefined,
          // Admin logs have no dedicated "doctorId" field, but registration/status-change
          // logs about a doctor do store the doctor's real id as a generic target
          // (targetType=DOCTOR, targetId=<doctorId>) — reuse that to make the Doctor
          // filter also surface those logs instead of only schedule-domain ones.
          targetType: appliedFilters.doctorId ? 'DOCTOR' : undefined,
          targetId: appliedFilters.doctorId || undefined,
          startTime: appliedFilters.startDate ? `${appliedFilters.startDate}T00:00:00` : undefined,
          endTime: appliedFilters.endDate ? `${appliedFilters.endDate}T23:59:59` : undefined
        };

        const [scheduleResponse, adminResponse] = await Promise.all([
          categoryFilterActive
            ? Promise.resolve(emptySourceResult)
            : scheduleApi.getAuditLogs(scheduleParams).catch(err => {
                console.error('Schedule audit error:', err);
                return emptySourceResult;
              }),
          auditApi.getLogs(adminParams).catch(err => {
            console.error('Admin audit error:', err);
            return emptySourceResult;
          })
        ]);

        console.log('Schedule response:', scheduleResponse);
        console.log('Admin response:', adminResponse);

        const scheduleLogs = (scheduleResponse.logs || []).map(log => ({ ...log, source: 'schedule' }));
        const adminLogs = (adminResponse.logs || []).map(log => ({ ...log, source: 'admin' }));

        // Merge and sort by createdAt descending, then slice out this page's window
        const mergedTopK = [...scheduleLogs, ...adminLogs].sort((a, b) =>
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        const pageStart = (pagination.pageNumber - 1) * pagination.pageSize;
        const pageLogs = mergedTopK.slice(pageStart, pageStart + pagination.pageSize);

        setLogs(pageLogs);
        const totalElements = (scheduleResponse.totalElements || 0) + (adminResponse.totalElements || 0);
        const totalPages = Math.ceil(totalElements / pagination.pageSize) || 0;
        setPagination(prev => ({
          ...prev,
          totalPages,
          totalElements
        }));
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      showToast({ title: 'Error', message: 'Could not load audit logs', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => {
      // Changing category invalidates any previously selected action type
      // that doesn't belong to the new category — reset it so Apply can't
      // send a category/actionType combo that can never match any row.
      if (name === 'category') {
        return { ...prev, category: value, actionType: '' };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleApplyFilters = () => {
    setAppliedFilters(filters);
    setPagination(prev => ({ ...prev, pageNumber: 1 }));
  };

  const handleClearFilters = () => {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setPagination(prev => ({ ...prev, pageNumber: 1 }));
  };

  const handleSourceChange = (source) => {
    setActiveSource(source);
    const resetFilters = {
      category: '',
      doctorId: '',
      actionType: '',
      startDate: filters.startDate,
      endDate: filters.endDate
    };
    setFilters(resetFilters);
    setAppliedFilters(resetFilters);
    setPagination(prev => ({ ...prev, pageNumber: 1 }));
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, pageNumber: newPage }));
    }
  };

  const handleViewDetail = (log) => {
    setSelectedLog(log);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedLog(null);
  };

  const getDoctorName = (doctorId) => {
    const doc = doctors.find(d => d.doctorId === doctorId);
    return doc ? doc.fullName : doctorId;
  };

  const getCategoryLabel = (value) => categories.find(c => c.value === value)?.label || value;

  const handleExport = async () => {
    try {
      setExporting(true);
      await auditApi.exportLogs({
        source: activeSource.toUpperCase(),
        category: appliedFilters.category,
        doctorId: appliedFilters.doctorId,
        actionType: appliedFilters.actionType,
        startTime: appliedFilters.startDate ? `${appliedFilters.startDate}T00:00:00` : undefined,
        endTime: appliedFilters.endDate ? `${appliedFilters.endDate}T23:59:59` : undefined,
        format: exportFormat
      });
      setShowExportModal(false);
      showToast({ title: 'Success', message: 'Audit log exported successfully', type: 'success' });
    } catch (err) {
      console.error('Export error:', err);
      showToast({ title: 'Error', message: 'Could not export audit log', type: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const getActionBadgeClass = (actionType) => {
    switch (actionType) {
      // Schedule actions
      case 'CANCEL_APPOINTMENT': return 'cancel';
      case 'REASSIGN_APPOINTMENT': return 'reassign';
      // User actions
      case 'USER_STATUS_CHANGED': return 'user-status';
      case 'PAYPAL_EMAIL_CHANGED': return 'user-status';
      // Registration actions
      case 'REGISTRATION_APPROVED': return 'approved';
      case 'REGISTRATION_REJECTED': return 'rejected';
      case 'AI_REJECTED': return 'rejected';
      // Commission actions
      case 'COMMISSION_CONFIG_CHANGED': return 'commission-config';
      case 'COMMISSION_PARTNER_CHANGED': return 'commission-partner';
      case 'COMMISSION_PARTNER_RESET': return 'commission-reset';
      default: return 'default';
    }
  };

  const getCategoryBadgeClass = (category) => {
    switch (category) {
      case 'USER': return 'category-user';
      case 'REGISTRATION': return 'category-registration';
      case 'COMMISSION': return 'category-commission';
      default: return 'category-default';
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format JSON value to readable format
  const formatValueDisplay = (value) => {
    if (!value) return null;

    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;

      // Map field names to display labels
      const fieldLabels = {
        status: 'Status',
        commissionRate: 'Commission Rate',
        minCommission: 'Min Commission',
        maxCommission: 'Max Commission',
        customCommissionRateOnline: 'Online Rate',
        customCommissionRateOffline: 'Offline Rate',
        customCommissionRate: 'Custom Rate',
        effectiveFrom: 'Effective From',
        effectiveTo: 'Effective To',
        requestId: 'Request ID',
        registrationType: 'Registration Type',
        email: 'Email'
      };

      // Format value based on field type
      const formatFieldValue = (key, val) => {
        if (val === null || val === undefined) return '-';
        if (key.toLowerCase().includes('rate') || key.toLowerCase().includes('commission')) {
          // Format as percentage if it's a decimal rate
          if (typeof val === 'number' && val <= 1) {
            return `${(val * 100).toFixed(1)}%`;
          }
          return typeof val === 'number' ? `${val.toFixed(1)}%` : val;
        }
        if (key.toLowerCase().includes('date') || key.toLowerCase().includes('effective')) {
          return formatDateTime(val);
        }
        return String(val);
      };

      return (
        <div className="audit-value-formatted">
          {Object.entries(parsed).map(([key, val]) => (
            <div key={key} className="audit-value-row">
              <span className="audit-value-label">{fieldLabels[key] || key}:</span>
              <span className="audit-value-content">{formatFieldValue(key, val)}</span>
            </div>
          ))}
        </div>
      );
    } catch (e) {
      // If parsing fails, return as-is
      return <span>{String(value)}</span>;
    }
  };

  return (
    <NavbarAdmin
      sidebarCollapsed={sidebarCollapsed}
      onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
    >
      <Toast message={toast.message} type={toast.type} show={toast.show} onClose={hideToast} />

      <div className="admin-content">
        <div className="container-fluid py-3">
          {/* Header */}
          <div className="audit-page-header mb-3">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
              <div className="d-flex align-items-center gap-3">
                <div className="audit-page-icon">
                  <i className="bi bi-shield-check"></i>
                </div>
                <div>
                  <h2 className="audit-page-title">Audit Log</h2>
                  <p className="audit-page-subtitle mb-0">Track admin actions: schedules, users, registrations & commissions</p>
                </div>
              </div>
              <div className="d-flex align-items-center gap-2">
                <span className="audit-count-badge">
                  <i className="bi bi-database me-1"></i>
                  {pagination.totalElements.toLocaleString()} records
                </span>
                <button className="audit-btn outline" onClick={() => setShowExportModal(true)}>
                  <i className="bi bi-download"></i> Export
                </button>
              </div>
            </div>
          </div>

          {/* Source Tabs */}
          <div className="audit-source-tabs mb-3">
            <button
              className={`audit-source-tab ${activeSource === 'all' ? 'active' : ''}`}
              onClick={() => handleSourceChange('all')}
            >
              <i className="bi bi-collection me-2"></i>All Logs
            </button>
            <button
              className={`audit-source-tab ${activeSource === 'schedule' ? 'active' : ''}`}
              onClick={() => handleSourceChange('schedule')}
            >
              <i className="bi bi-calendar3 me-2"></i>Schedule
            </button>
            <button
              className={`audit-source-tab ${activeSource === 'admin' ? 'active' : ''}`}
              onClick={() => handleSourceChange('admin')}
            >
              <i className="bi bi-person-gear me-2"></i>Admin Actions
            </button>
          </div>

          {/* Filters */}
          <div className="audit-filter-card mb-3">
            <div className="audit-filter-row">
              {/* Category filter - only show for admin logs */}
              {(activeSource === 'admin' || activeSource === 'all') && (
                <div className="audit-filter-group">
                  <label className="audit-filter-label">
                    <i className="bi bi-folder me-1"></i>Category
                  </label>
                  <select
                    className="audit-filter-select"
                    name="category"
                    value={filters.category}
                    onChange={handleFilterChange}
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              )}
              {/* Doctor filter - only show for schedule logs */}
              {(activeSource === 'schedule' || activeSource === 'all') && (
                <div className="audit-filter-group">
                  <label className="audit-filter-label">
                    <i className="bi bi-person-vcard me-1"></i>Doctor
                  </label>
                  <select
                    className="audit-filter-select"
                    name="doctorId"
                    value={filters.doctorId}
                    onChange={handleFilterChange}
                  >
                    <option value="">All Doctors</option>
                    {doctors.map(doc => (
                      <option key={doc.doctorId} value={doc.doctorId}>
                        {doc.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="audit-filter-group">
                <label className="audit-filter-label">
                  <i className="bi bi-lightning me-1"></i>Action
                </label>
                <select
                  className="audit-filter-select"
                  name="actionType"
                  value={filters.actionType}
                  onChange={handleFilterChange}
                >
                  {actionTypes.map(at => (
                    <option key={at.value} value={at.value}>{at.label}</option>
                  ))}
                </select>
              </div>
              <div className="audit-filter-group">
                <label className="audit-filter-label">
                  <i className="bi bi-calendar-event me-1"></i>From
                </label>
                <input
                  type="date"
                  className="audit-filter-input"
                  name="startDate"
                  value={filters.startDate}
                  onChange={handleFilterChange}
                />
              </div>
              <div className="audit-filter-group">
                <label className="audit-filter-label">
                  <i className="bi bi-calendar-check me-1"></i>To
                </label>
                <input
                  type="date"
                  className="audit-filter-input"
                  name="endDate"
                  value={filters.endDate}
                  onChange={handleFilterChange}
                />
              </div>
              <div className="audit-filter-actions">
                <button className="audit-btn primary" onClick={handleApplyFilters}>
                  <i className="bi bi-funnel"></i> Apply
                </button>
                <button className="audit-btn outline" onClick={handleClearFilters}>
                  <i className="bi bi-arrow-counterclockwise"></i> Reset
                </button>
              </div>
            </div>
          </div>

          {/* Logs Table */}
          <div className="audit-table-card">
            {loading ? (
              <div className="audit-empty">
                <div className="spinner-border" style={{ color: '#00a08b' }} role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="audit-empty-text mt-3">Loading audit logs...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="audit-empty">
                <i className="bi bi-shield-exclamation audit-empty-icon"></i>
                <p className="audit-empty-text">No audit logs found</p>
                <small className="text-muted">Try adjusting your filters or date range</small>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th style={{ width: '140px' }}>Time</th>
                      <th style={{ width: '110px' }}>Category</th>
                      <th style={{ width: '150px' }}>Action</th>
                      <th style={{ width: '180px' }}>Admin</th>
                      <th style={{ width: '180px' }}>Target</th>
                      <th>Description</th>
                      <th style={{ width: '50px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(log => (
                      <tr key={`${log.source || 'schedule'}-${log.logId}`} onClick={() => handleViewDetail(log)}>
                        <td>
                          <span className="audit-time">{formatDateTime(log.createdAt)}</span>
                        </td>
                        <td>
                          {log.source === 'admin' ? (
                            <span className={`audit-category-badge ${getCategoryBadgeClass(log.category)}`}>
                              {log.categoryDisplay || log.category || '-'}
                            </span>
                          ) : (
                            <span className="audit-category-badge category-schedule">Schedule</span>
                          )}
                        </td>
                        <td>
                          <span className={`audit-action-badge ${getActionBadgeClass(log.actionType)}`}>
                            {log.actionTypeDisplay || log.actionType}
                          </span>
                        </td>
                        <td>
                          <div className="audit-admin-info">
                            <div className="audit-admin-avatar">
                              <i className="bi bi-person-badge"></i>
                            </div>
                            <div>
                              <div className="audit-admin-name">{log.adminUserName || 'System'}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="audit-target">
                            {log.source === 'admin' ? (
                              <>
                                {log.targetType && (
                                  <span className="audit-target-type me-1">
                                    <i className={`bi ${log.targetType === 'PATIENT' ? 'bi-person' : log.targetType === 'DOCTOR' ? 'bi-person-vcard' : log.targetType === 'PHARMACY' ? 'bi-shop' : 'bi-gear'}`}></i>
                                  </span>
                                )}
                                {log.targetName || log.targetId || '-'}
                              </>
                            ) : (
                              <>
                                {log.targetDoctorName ? (
                                  <><i className="bi bi-person-vcard me-1"></i>{log.targetDoctorName}</>
                                ) : log.targetAppointmentId ? (
                                  <><i className="bi bi-calendar-check me-1"></i>Appt #{log.targetAppointmentId}</>
                                ) : '-'}
                              </>
                            )}
                          </span>
                        </td>
                        <td>
                          <span className="audit-description" title={log.description}>
                            {log.description || '-'}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-link p-0"
                            style={{ color: '#00a08b' }}
                            onClick={(e) => { e.stopPropagation(); handleViewDetail(log); }}
                            title="View details"
                          >
                            <i className="bi bi-eye"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {!loading && logs.length > 0 && (
              <div className="audit-pagination">
                <span className="audit-pagination-info">
                  <i className="bi bi-file-earmark-text me-1"></i>
                  Showing page <strong>{pagination.pageNumber}</strong> of <strong>{pagination.totalPages}</strong>
                  <span className="mx-2">•</span>
                  {pagination.totalElements.toLocaleString()} total records
                </span>
                <div className="audit-pagination-controls">
                  <button
                    className="audit-page-btn"
                    onClick={() => handlePageChange(1)}
                    disabled={pagination.pageNumber === 1}
                    title="First page"
                  >
                    <i className="bi bi-chevron-double-left"></i>
                  </button>
                  <button
                    className="audit-page-btn"
                    onClick={() => handlePageChange(pagination.pageNumber - 1)}
                    disabled={pagination.pageNumber === 1}
                    title="Previous page"
                  >
                    <i className="bi bi-chevron-left"></i>
                  </button>
                  {[...Array(Math.min(5, pagination.totalPages || 1))].map((_, idx) => {
                    let pageNum;
                    const totalPages = pagination.totalPages || 1;
                    if (totalPages <= 5) {
                      pageNum = idx + 1;
                    } else if (pagination.pageNumber <= 3) {
                      pageNum = idx + 1;
                    } else if (pagination.pageNumber >= totalPages - 2) {
                      pageNum = totalPages - 4 + idx;
                    } else {
                      pageNum = pagination.pageNumber - 2 + idx;
                    }
                    if (pageNum < 1 || pageNum > totalPages) return null;
                    return (
                      <button
                        key={pageNum}
                        className={`audit-page-btn ${pagination.pageNumber === pageNum ? 'active' : ''}`}
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    className="audit-page-btn"
                    onClick={() => handlePageChange(pagination.pageNumber + 1)}
                    disabled={pagination.pageNumber === pagination.totalPages || pagination.totalPages === 0}
                    title="Next page"
                  >
                    <i className="bi bi-chevron-right"></i>
                  </button>
                  <button
                    className="audit-page-btn"
                    onClick={() => handlePageChange(pagination.totalPages)}
                    disabled={pagination.pageNumber === pagination.totalPages || pagination.totalPages === 0}
                    title="Last page"
                  >
                    <i className="bi bi-chevron-double-right"></i>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedLog && (
        <div className="audit-modal-overlay">
          <div className="audit-modal">
            <div className="audit-modal-header">
              <h5 className="audit-modal-title">
                <i className="bi bi-journal-text"></i>
                Audit Log Detail
              </h5>
              <button className="audit-modal-close" onClick={handleCloseDetailModal}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="audit-modal-body">
              <div className="audit-detail-grid">
                <div className="audit-detail-item">
                  <div className="audit-detail-label">Log ID</div>
                  <div className="audit-detail-value">#{selectedLog.logId}</div>
                </div>
                <div className="audit-detail-item">
                  <div className="audit-detail-label">Timestamp</div>
                  <div className="audit-detail-value">{formatDateTime(selectedLog.createdAt)}</div>
                </div>
                {selectedLog.source === 'admin' && selectedLog.category && (
                  <div className="audit-detail-item">
                    <div className="audit-detail-label">Category</div>
                    <div className="audit-detail-value">
                      <span className={`audit-category-badge ${getCategoryBadgeClass(selectedLog.category)}`}>
                        {selectedLog.categoryDisplay || selectedLog.category}
                      </span>
                    </div>
                  </div>
                )}
                <div className="audit-detail-item">
                  <div className="audit-detail-label">Action Type</div>
                  <div className="audit-detail-value">
                    <span className={`audit-action-badge ${getActionBadgeClass(selectedLog.actionType)}`}>
                      {selectedLog.actionTypeDisplay || selectedLog.actionType}
                    </span>
                  </div>
                </div>
                <div className="audit-detail-item">
                  <div className="audit-detail-label">Performed By</div>
                  <div className="audit-admin-info">
                    <div className="audit-admin-avatar">
                      <i className="bi bi-person-badge"></i>
                    </div>
                    <div>
                      <div className="audit-admin-name">{selectedLog.adminUserName || 'Unknown'}</div>
                      <div className="audit-admin-email">{selectedLog.adminEmail}</div>
                    </div>
                  </div>
                </div>
                {/* Schedule log specific fields */}
                {selectedLog.targetDoctorName && (
                  <div className="audit-detail-item">
                    <div className="audit-detail-label">Target Doctor</div>
                    <div className="audit-detail-value">
                      <i className="bi bi-person-circle me-1"></i>{selectedLog.targetDoctorName}
                    </div>
                  </div>
                )}
                {selectedLog.targetAppointmentId && (
                  <div className="audit-detail-item">
                    <div className="audit-detail-label">Target Appointment</div>
                    <div className="audit-detail-value">
                      <i className="bi bi-calendar-check me-1"></i>#{selectedLog.targetAppointmentId}
                    </div>
                  </div>
                )}
                {/* Admin log specific fields */}
                {selectedLog.source === 'admin' && selectedLog.targetType && (
                  <div className="audit-detail-item">
                    <div className="audit-detail-label">Target Type</div>
                    <div className="audit-detail-value">
                      <i className={`bi ${selectedLog.targetType === 'PATIENT' ? 'bi-person' : selectedLog.targetType === 'DOCTOR' ? 'bi-person-vcard' : selectedLog.targetType === 'PHARMACY' ? 'bi-shop' : 'bi-gear'} me-1`}></i>
                      {selectedLog.targetType}
                    </div>
                  </div>
                )}
                {selectedLog.source === 'admin' && selectedLog.targetName && (
                  <div className="audit-detail-item">
                    <div className="audit-detail-label">Target Name</div>
                    <div className="audit-detail-value">{selectedLog.targetName}</div>
                  </div>
                )}
                <div className="audit-detail-item full">
                  <div className="audit-detail-label">Description</div>
                  <div className="audit-detail-value">{selectedLog.description || '-'}</div>
                </div>
                {selectedLog.oldValue && (
                  <div className="audit-detail-item full">
                    <div className="audit-detail-label">
                      <i className="bi bi-arrow-left-circle me-1"></i>Old Value
                    </div>
                    <div className="audit-detail-value">
                      {formatValueDisplay(selectedLog.oldValue)}
                    </div>
                  </div>
                )}
                {selectedLog.newValue && (
                  <div className="audit-detail-item full">
                    <div className="audit-detail-label">
                      <i className="bi bi-arrow-right-circle me-1"></i>New Value
                    </div>
                    <div className="audit-detail-value">
                      {formatValueDisplay(selectedLog.newValue)}
                    </div>
                  </div>
                )}
                <div className="audit-detail-item full warning">
                  <div className="audit-detail-label">
                    <i className="bi bi-chat-left-text me-1"></i>Reason
                  </div>
                  <div className="audit-detail-value">{selectedLog.reason || 'No reason provided'}</div>
                </div>
              </div>
            </div>
            <div className="audit-modal-footer">
              <button className="audit-modal-btn" onClick={handleCloseDetailModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="audit-modal-overlay">
          <div className="audit-modal">
            <div className="audit-modal-header">
              <h5 className="audit-modal-title">
                <i className="bi bi-download"></i>
                Export Audit Log
              </h5>
              <button className="audit-modal-close" onClick={() => setShowExportModal(false)} disabled={exporting}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="audit-modal-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <p className="text-muted mb-0">
                  The export will include every record matching the filters currently applied:
                </p>
                <span className="audit-count-badge">
                  <i className="bi bi-database me-1"></i>
                  {pagination.totalElements.toLocaleString()} records
                </span>
              </div>
              <div className="audit-detail-grid">
                <div className="audit-detail-item">
                  <div className="audit-detail-label">Source</div>
                  <div className="audit-detail-value">{SOURCE_LABELS[activeSource]}</div>
                </div>
                <div className="audit-detail-item">
                  <div className="audit-detail-label">Category</div>
                  <div className="audit-detail-value">
                    {appliedFilters.category ? getCategoryLabel(appliedFilters.category) : 'All Categories'}
                  </div>
                </div>
                <div className="audit-detail-item">
                  <div className="audit-detail-label">Doctor</div>
                  <div className="audit-detail-value">
                    {appliedFilters.doctorId ? getDoctorName(appliedFilters.doctorId) : 'All Doctors'}
                  </div>
                </div>
                <div className="audit-detail-item">
                  <div className="audit-detail-label">Action</div>
                  <div className="audit-detail-value">
                    {appliedFilters.actionType
                      ? (ACTION_TYPE_LABELS[appliedFilters.actionType] || appliedFilters.actionType)
                      : 'All Actions'}
                  </div>
                </div>
                <div className="audit-detail-item full">
                  <div className="audit-detail-label">Date Range</div>
                  <div className="audit-detail-value">
                    {appliedFilters.startDate || appliedFilters.endDate
                      ? `${appliedFilters.startDate || '…'} → ${appliedFilters.endDate || '…'}`
                      : 'All time'}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <label className="audit-filter-label d-block mb-2">
                  <i className="bi bi-file-earmark-spreadsheet me-1"></i>File format
                </label>
                <div className="d-flex gap-2">
                  <label className={`audit-export-format-option ${exportFormat === 'CSV' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="exportFormat"
                      value="CSV"
                      checked={exportFormat === 'CSV'}
                      onChange={() => setExportFormat('CSV')}
                    />
                    <div>
                      <div className="fw-semibold">CSV</div>
                      <small className="text-muted">Plain data, opens in any spreadsheet app</small>
                    </div>
                  </label>
                  <label className={`audit-export-format-option ${exportFormat === 'XLSX' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="exportFormat"
                      value="XLSX"
                      checked={exportFormat === 'XLSX'}
                      onChange={() => setExportFormat('XLSX')}
                    />
                    <div>
                      <div className="fw-semibold">Excel (.xlsx)</div>
                      <small className="text-muted">Bold headers, auto-sized columns</small>
                    </div>
                  </label>
                </div>
              </div>
            </div>
            <div className="audit-modal-footer">
              <button className="audit-modal-btn" onClick={() => setShowExportModal(false)} disabled={exporting}>
                Cancel
              </button>
              <button className="audit-btn primary" onClick={handleExport} disabled={exporting}>
                {exporting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                    Exporting...
                  </>
                ) : (
                  <>
                    <i className="bi bi-download"></i> Confirm Export
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
