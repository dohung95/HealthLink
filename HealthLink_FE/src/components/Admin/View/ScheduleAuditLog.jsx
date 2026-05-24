import React, { useState, useEffect } from "react";
import NavbarAdmin from "./NavbarAdmin";
import { scheduleApi, doctorsApi } from "../../../api/adminApi";
import Toast from "./Toast";
import useToast from "../useToast";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../Css/Admin.css";

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
        <div className="container-fluid py-4">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="mb-1">
                <i className="bi bi-journal-text me-2 text-primary"></i>
                Audit Log
              </h2>
              <p className="text-muted mb-0">Track all admin actions on schedules and appointments</p>
            </div>
            <span className="badge bg-primary fs-6">
              {pagination.totalElements} records
            </span>
          </div>

          {/* Filters */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="row g-3 align-items-end">
                <div className="col-md-3">
                  <label className="form-label">Doctor</label>
                  <select
                    className="form-select"
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
                <div className="col-md-2">
                  <label className="form-label">Action Type</label>
                  <select
                    className="form-select"
                    name="actionType"
                    value={filters.actionType}
                    onChange={handleFilterChange}
                  >
                    {actionTypes.map(at => (
                      <option key={at.value} value={at.value}>{at.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label">From Date</label>
                  <input
                    type="date"
                    className="form-control"
                    name="startDate"
                    value={filters.startDate}
                    onChange={handleFilterChange}
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label">To Date</label>
                  <input
                    type="date"
                    className="form-control"
                    name="endDate"
                    value={filters.endDate}
                    onChange={handleFilterChange}
                  />
                </div>
                <div className="col-md-3">
                  <div className="d-flex gap-2">
                    <button className="btn btn-primary" onClick={handleApplyFilters}>
                      <i className="bi bi-search me-1"></i> Filter
                    </button>
                    <button className="btn btn-outline-secondary" onClick={handleClearFilters}>
                      <i className="bi bi-x-lg me-1"></i> Clear
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Logs Table */}
          <div className="card">
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-journal-x display-1 text-muted"></i>
                  <p className="text-muted mt-3">No audit logs found</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: '150px' }}>Time</th>
                        <th style={{ width: '130px' }}>Action</th>
                        <th>Admin</th>
                        <th>Target Doctor</th>
                        <th>Description</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map(log => (
                        <tr
                          key={log.logId}
                          onClick={() => handleViewDetail(log)}
                          style={{ cursor: 'pointer' }}
                          className="table-row-hover"
                        >
                          <td>
                            <small>{formatDateTime(log.createdAt)}</small>
                          </td>
                          <td>
                            <span className={`badge ${getActionBadgeClass(log.actionType)}`}>
                              {log.actionTypeDisplay || log.actionType}
                            </span>
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="avatar-sm bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center me-2">
                                <i className="bi bi-person-badge text-primary"></i>
                              </div>
                              <div>
                                <div className="fw-semibold">{log.adminUserName || 'Unknown'}</div>
                                <small className="text-muted">{log.adminEmail}</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            {log.targetDoctorName ? (
                              <span>
                                <i className="bi bi-person me-1"></i>
                                {log.targetDoctorName}
                              </span>
                            ) : log.targetAppointmentId ? (
                              <span className="text-muted">
                                Appointment #{log.targetAppointmentId}
                              </span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>
                            <span className="text-truncate d-inline-block" style={{ maxWidth: '250px' }} title={log.description}>
                              {log.description}
                            </span>
                          </td>
                          <td>
                            <span className="text-truncate d-inline-block" style={{ maxWidth: '200px' }} title={log.reason}>
                              {log.reason || '-'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pagination */}
            {!loading && logs.length > 0 && (
              <div className="card-footer bg-white">
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-muted">
                    Page {pagination.pageNumber} of {pagination.totalPages}
                    {' '}&bull;{' '}
                    {pagination.totalElements} total records
                  </span>
                  <nav>
                    <ul className="pagination mb-0">
                      <li className={`page-item ${pagination.pageNumber === 1 ? 'disabled' : ''}`}>
                        <button
                          className="page-link"
                          onClick={() => handlePageChange(pagination.pageNumber - 1)}
                          disabled={pagination.pageNumber === 1}
                        >
                          <i className="bi bi-chevron-left"></i>
                        </button>
                      </li>
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
                          <li
                            key={pageNum}
                            className={`page-item ${pagination.pageNumber === pageNum ? 'active' : ''}`}
                          >
                            <button
                              className="page-link"
                              onClick={() => handlePageChange(pageNum)}
                            >
                              {pageNum}
                            </button>
                          </li>
                        );
                      })}
                      <li className={`page-item ${pagination.pageNumber === pagination.totalPages ? 'disabled' : ''}`}>
                        <button
                          className="page-link"
                          onClick={() => handlePageChange(pagination.pageNumber + 1)}
                          disabled={pagination.pageNumber === pagination.totalPages}
                        >
                          <i className="bi bi-chevron-right"></i>
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedLog && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-journal-text me-2"></i>
                  Audit Log Detail
                </h5>
                <button type="button" className="btn-close" onClick={handleCloseDetailModal}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  {/* Log ID & Time */}
                  <div className="col-md-6">
                    <div className="p-3 bg-light rounded">
                      <label className="form-label text-muted small mb-1">Log ID</label>
                      <div className="fw-semibold">#{selectedLog.logId}</div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="p-3 bg-light rounded">
                      <label className="form-label text-muted small mb-1">Timestamp</label>
                      <div className="fw-semibold">{formatDateTime(selectedLog.createdAt)}</div>
                    </div>
                  </div>

                  {/* Action Type */}
                  <div className="col-md-6">
                    <div className="p-3 bg-light rounded">
                      <label className="form-label text-muted small mb-1">Action Type</label>
                      <div>
                        <span className={`badge ${getActionBadgeClass(selectedLog.actionType)} fs-6`}>
                          {selectedLog.actionTypeDisplay || selectedLog.actionType}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Admin Info */}
                  <div className="col-md-6">
                    <div className="p-3 bg-light rounded">
                      <label className="form-label text-muted small mb-1">Performed By (Admin)</label>
                      <div className="d-flex align-items-center">
                        <div className="avatar-sm bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center me-2">
                          <i className="bi bi-person-badge text-primary"></i>
                        </div>
                        <div>
                          <div className="fw-semibold">{selectedLog.adminUserName || 'Unknown'}</div>
                          <small className="text-muted">{selectedLog.adminEmail}</small>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Target Doctor */}
                  {selectedLog.targetDoctorName && (
                    <div className="col-md-6">
                      <div className="p-3 bg-light rounded">
                        <label className="form-label text-muted small mb-1">Target Doctor</label>
                        <div className="d-flex align-items-center">
                          <i className="bi bi-person-circle text-success me-2 fs-5"></i>
                          <span className="fw-semibold">{selectedLog.targetDoctorName}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Target Appointment */}
                  {selectedLog.targetAppointmentId && (
                    <div className="col-md-6">
                      <div className="p-3 bg-light rounded">
                        <label className="form-label text-muted small mb-1">Target Appointment</label>
                        <div className="d-flex align-items-center">
                          <i className="bi bi-calendar-check text-info me-2 fs-5"></i>
                          <span className="fw-semibold">Appointment #{selectedLog.targetAppointmentId}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  <div className="col-12">
                    <div className="p-3 bg-light rounded">
                      <label className="form-label text-muted small mb-1">Description</label>
                      <div className="fw-semibold">{selectedLog.description || '-'}</div>
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="col-12">
                    <div className="p-3 bg-warning bg-opacity-10 border border-warning rounded">
                      <label className="form-label text-muted small mb-1">
                        <i className="bi bi-chat-left-text me-1"></i>
                        Reason
                      </label>
                      <div className="fw-semibold">{selectedLog.reason || 'No reason provided'}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseDetailModal}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </NavbarAdmin>
  );
}
