import React, { useState, useEffect } from "react";
import NavbarAdmin from "./NavbarAdmin";
import { scheduleApi, doctorsApi } from "../../../api/adminApi";
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
    doctorId: '',
    actionType: '',
    startDate: '',
    endDate: ''
  });

  // Doctors list for filter
  const [doctors, setDoctors] = useState([]);

  // Detail modal state
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Action types
  const actionTypes = [
    { value: '', label: 'All Actions' },
    { value: 'BLOCK_SLOT', label: 'Block Slot' },
    { value: 'UNBLOCK_SLOT', label: 'Unblock Slot' },
    { value: 'MODIFY_SCHEDULE', label: 'Modify Schedule' },
    { value: 'CANCEL_APPOINTMENT', label: 'Cancel Appointment' },
    { value: 'REASSIGN_APPOINTMENT', label: 'Reassign Appointment' }
  ];

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
  }, [pagination.pageNumber, pagination.pageSize]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const params = {
        pageNumber: pagination.pageNumber,
        pageSize: pagination.pageSize,
        doctorId: filters.doctorId || undefined,
        actionType: filters.actionType || undefined,
        startTime: filters.startDate ? `${filters.startDate}T00:00:00` : undefined,
        endTime: filters.endDate ? `${filters.endDate}T23:59:59` : undefined
      };

      const response = await scheduleApi.getAuditLogs(params);
      setLogs(response.logs || []);
      setPagination(prev => ({
        ...prev,
        totalPages: response.totalPages || 0,
        totalElements: response.totalElements || 0
      }));
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
      doctorId: '',
      actionType: '',
      startDate: '',
      endDate: ''
    });
    setPagination(prev => ({ ...prev, pageNumber: 1 }));
    setTimeout(fetchAuditLogs, 0);
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
      case 'BLOCK_SLOT': return 'bg-danger';
      case 'UNBLOCK_SLOT': return 'bg-success';
      case 'MODIFY_SCHEDULE': return 'bg-warning text-dark';
      case 'CANCEL_APPOINTMENT': return 'bg-danger';
      case 'REASSIGN_APPOINTMENT': return 'bg-info';
      default: return 'bg-secondary';
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
            <div className="d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <div className="audit-page-icon">
                  <i className="bi bi-journal-text"></i>
                </div>
                <div>
                  <h2 className="audit-page-title">Audit Log</h2>
                  <p className="audit-page-subtitle mb-0">Track all admin actions on schedules and appointments</p>
                </div>
              </div>
              <span className="audit-count-badge">
                {pagination.totalElements} records
              </span>
            </div>
          </div>

          {/* Filters */}
          <div className="audit-filter-card mb-3">
            <div className="audit-filter-row">
              <div className="audit-filter-group">
                <label className="audit-filter-label">Doctor</label>
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
              <div className="audit-filter-group">
                <label className="audit-filter-label">Action Type</label>
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
                <label className="audit-filter-label">From Date</label>
                <input
                  type="date"
                  className="audit-filter-input"
                  name="startDate"
                  value={filters.startDate}
                  onChange={handleFilterChange}
                />
              </div>
              <div className="audit-filter-group">
                <label className="audit-filter-label">To Date</label>
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
                  <i className="bi bi-search"></i> Filter
                </button>
                <button className="audit-btn outline" onClick={handleClearFilters}>
                  <i className="bi bi-x-lg"></i> Clear
                </button>
              </div>
            </div>
          </div>

          {/* Logs Table */}
          <div className="audit-table-card">
            {loading ? (
              <div className="audit-empty">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : logs.length === 0 ? (
              <div className="audit-empty">
                <i className="bi bi-journal-x audit-empty-icon"></i>
                <p className="audit-empty-text">No audit logs found</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th style={{ width: '130px' }}>Time</th>
                      <th style={{ width: '110px' }}>Action</th>
                      <th>Admin</th>
                      <th>Target</th>
                      <th>Description</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(log => (
                      <tr key={log.logId} onClick={() => handleViewDetail(log)}>
                        <td>
                          <span className="audit-time">{formatDateTime(log.createdAt)}</span>
                        </td>
                        <td>
                          <span className={`audit-action-badge ${log.actionType === 'BLOCK_SLOT' ? 'block' : log.actionType === 'UNBLOCK_SLOT' ? 'unblock' : log.actionType === 'MODIFY_SCHEDULE' ? 'modify' : log.actionType === 'CANCEL_APPOINTMENT' ? 'cancel' : 'reassign'}`}>
                            {log.actionTypeDisplay || log.actionType}
                          </span>
                        </td>
                        <td>
                          <div className="audit-admin-info">
                            <div className="audit-admin-avatar">
                              <i className="bi bi-person-badge"></i>
                            </div>
                            <div>
                              <div className="audit-admin-name">{log.adminUserName || 'Unknown'}</div>
                              <div className="audit-admin-email">{log.adminEmail}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="audit-target">
                            {log.targetDoctorName ? (
                              <><i className="bi bi-person me-1"></i>{log.targetDoctorName}</>
                            ) : log.targetAppointmentId ? (
                              <>Appt #{log.targetAppointmentId}</>
                            ) : '-'}
                          </span>
                        </td>
                        <td>
                          <span className="audit-description" title={log.description}>
                            {log.description}
                          </span>
                        </td>
                        <td>
                          <span className="audit-description" title={log.reason}>
                            {log.reason || '-'}
                          </span>
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
                  Page {pagination.pageNumber} of {pagination.totalPages} &bull; {pagination.totalElements} records
                </span>
                <div className="audit-pagination-controls">
                  <button
                    className="audit-page-btn"
                    onClick={() => handlePageChange(pagination.pageNumber - 1)}
                    disabled={pagination.pageNumber === 1}
                  >
                    <i className="bi bi-chevron-left"></i>
                  </button>
                  {[...Array(Math.min(5, pagination.totalPages))].map((_, idx) => {
                    let pageNum;
                    if (pagination.totalPages <= 5) {
                      pageNum = idx + 1;
                    } else if (pagination.pageNumber <= 3) {
                      pageNum = idx + 1;
                    } else if (pagination.pageNumber >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + idx;
                    } else {
                      pageNum = pagination.pageNumber - 2 + idx;
                    }
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
                    disabled={pagination.pageNumber === pagination.totalPages}
                  >
                    <i className="bi bi-chevron-right"></i>
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
                <div className="audit-detail-item">
                  <div className="audit-detail-label">Action Type</div>
                  <div className="audit-detail-value">
                    <span className={`audit-action-badge ${selectedLog.actionType === 'BLOCK_SLOT' ? 'block' : selectedLog.actionType === 'UNBLOCK_SLOT' ? 'unblock' : 'modify'}`}>
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
                <div className="audit-detail-item full">
                  <div className="audit-detail-label">Description</div>
                  <div className="audit-detail-value">{selectedLog.description || '-'}</div>
                </div>
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
