import React, { useState, useEffect } from "react";
import NavbarAdmin from "./NavbarAdmin";
import { scheduleApi, doctorsApi, auditApi } from "../../../api/adminApi";
import Toast from "./Toast";
import useToast from "../useToast";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../Css/Admin.css";
import "../Css/AuditLog.css";

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

  // Filter state
  const [filters, setFilters] = useState({
    category: '',
    doctorId: '',
    actionType: '',
    startDate: '',
    endDate: ''
  });

  // Active tab for log source
  const [activeSource, setActiveSource] = useState('all'); // 'all', 'schedule', 'admin'

  // Doctors list for filter
  const [doctors, setDoctors] = useState([]);

  // Detail modal state
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

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
      { value: 'USER_STATUS_CHANGED', label: 'Status Changed' }
    ];

    const registrationActions = [
      { value: 'REGISTRATION_APPROVED', label: 'Approved' },
      { value: 'REGISTRATION_REJECTED', label: 'Rejected' }
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

  // Fetch audit logs
  useEffect(() => {
    fetchAuditLogs();
  }, [pagination.pageNumber, pagination.pageSize, activeSource]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);

      if (activeSource === 'schedule') {
        // Fetch only schedule audit logs
        const params = {
          pageNumber: pagination.pageNumber,
          pageSize: pagination.pageSize,
          doctorId: filters.doctorId || undefined,
          actionType: filters.actionType || undefined,
          startTime: filters.startDate ? `${filters.startDate}T00:00:00` : undefined,
          endTime: filters.endDate ? `${filters.endDate}T23:59:59` : undefined
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
          category: filters.category || undefined,
          actionType: filters.actionType || undefined,
          startTime: filters.startDate ? `${filters.startDate}T00:00:00` : undefined,
          endTime: filters.endDate ? `${filters.endDate}T23:59:59` : undefined
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
        // Fetch both and merge (for 'all' tab)
        const scheduleParams = {
          pageNumber: pagination.pageNumber,
          pageSize: pagination.pageSize,
          doctorId: filters.doctorId || undefined,
          actionType: filters.actionType || undefined,
          startTime: filters.startDate ? `${filters.startDate}T00:00:00` : undefined,
          endTime: filters.endDate ? `${filters.endDate}T23:59:59` : undefined
        };

        const adminParams = {
          pageNumber: pagination.pageNumber,
          pageSize: pagination.pageSize,
          category: filters.category || undefined,
          actionType: filters.actionType || undefined,
          startTime: filters.startDate ? `${filters.startDate}T00:00:00` : undefined,
          endTime: filters.endDate ? `${filters.endDate}T23:59:59` : undefined
        };

        const [scheduleResponse, adminResponse] = await Promise.all([
          scheduleApi.getAuditLogs(scheduleParams).catch(err => {
            console.error('Schedule audit error:', err);
            return { logs: [], totalElements: 0, totalPages: 0 };
          }),
          auditApi.getLogs(adminParams).catch(err => {
            console.error('Admin audit error:', err);
            return { logs: [], totalElements: 0, totalPages: 0 };
          })
        ]);

        console.log('Schedule response:', scheduleResponse);
        console.log('Admin response:', adminResponse);

        const scheduleLogs = (scheduleResponse.logs || []).map(log => ({ ...log, source: 'schedule' }));
        const adminLogs = (adminResponse.logs || []).map(log => ({ ...log, source: 'admin' }));

        // Merge and sort by createdAt descending
        const allLogs = [...scheduleLogs, ...adminLogs].sort((a, b) =>
          new Date(b.createdAt) - new Date(a.createdAt)
        );

        setLogs(allLogs);
        const totalElements = (scheduleResponse.totalElements || 0) + (adminResponse.totalElements || 0);
        const maxPages = Math.max(scheduleResponse.totalPages || 0, adminResponse.totalPages || 0);
        setPagination(prev => ({
          ...prev,
          totalPages: maxPages,
          totalElements: totalElements
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
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleApplyFilters = () => {
    setPagination(prev => ({ ...prev, pageNumber: 1 }));
    fetchAuditLogs();
  };

  const handleClearFilters = () => {
    setFilters({
      category: '',
      doctorId: '',
      actionType: '',
      startDate: '',
      endDate: ''
    });
    setPagination(prev => ({ ...prev, pageNumber: 1 }));
    setTimeout(fetchAuditLogs, 0);
  };

  const handleSourceChange = (source) => {
    setActiveSource(source);
    setFilters({
      category: '',
      doctorId: '',
      actionType: '',
      startDate: filters.startDate,
      endDate: filters.endDate
    });
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

  const getActionBadgeClass = (actionType) => {
    switch (actionType) {
      // Schedule actions
      case 'CANCEL_APPOINTMENT': return 'cancel';
      case 'REASSIGN_APPOINTMENT': return 'reassign';
      // User actions
      case 'USER_STATUS_CHANGED': return 'user-status';
      // Registration actions
      case 'REGISTRATION_APPROVED': return 'approved';
      case 'REGISTRATION_REJECTED': return 'rejected';
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
                      <option key={doc.doctorID} value={doc.doctorID}>
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
    </NavbarAdmin>
  );
}
