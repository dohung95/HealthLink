import React, { useState, useEffect, useMemo } from "react";
import NavbarAdmin from "./NavbarAdmin";
import { adminComplianceService } from "../../../api/complianceApi";
import Toast from "./Toast";
import useToast from "../useToast";
import { getAvatarUrl } from "../../../utils/avatarHelper";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../Css/Admin.css";

export default function ScheduleComplianceDashboard() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { toast, showToast, hideToast } = useToast();

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

  // Fetch data when filters change
  useEffect(() => {
    fetchData();
  }, [selectedMonth, statusFilter, specialtyFilter, pageNumber]);

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

  // Generate month options (current month + 6 months back + 1 month forward)
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
            <h4 className="mb-1">Schedule Compliance</h4>
            <p className="text-muted mb-0">Monitor and manage doctor schedule compliance</p>
          </div>
          <select
            className="form-select"
            style={{ width: '200px' }}
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

        {/* Statistics Cards */}
        {statistics && (
          <div className="row g-3 mb-4">
            <div className="col-md-2">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body text-center">
                  <h3 className="mb-1">{statistics.totalDoctors}</h3>
                  <small className="text-muted">Total Doctors</small>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="card border-success border-2 h-100">
                <div className="card-body text-center">
                  <h3 className="mb-1 text-success">{statistics.compliantCount}</h3>
                  <small className="text-muted">Compliant</small>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="card border-warning border-2 h-100">
                <div className="card-body text-center">
                  <h3 className="mb-1 text-warning">{statistics.inProgressCount}</h3>
                  <small className="text-muted">In Progress</small>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="card border-info border-2 h-100">
                <div className="card-body text-center">
                  <h3 className="mb-1 text-info">{statistics.pendingCount}</h3>
                  <small className="text-muted">Pending</small>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="card border-danger border-2 h-100">
                <div className="card-body text-center">
                  <h3 className="mb-1 text-danger">{statistics.nonCompliantCount}</h3>
                  <small className="text-muted">Non-Compliant</small>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="card border-secondary border-2 h-100">
                <div className="card-body text-center">
                  <h3 className="mb-1 text-secondary">{statistics.exemptedCount}</h3>
                  <small className="text-muted">Exempted</small>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Compliance Rate Card */}
        {statistics && (
          <div className="card shadow-sm mb-4">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">Overall Compliance Rate</h6>
                <span className="badge bg-primary">{statistics.compliantPercentage?.toFixed(1)}%</span>
              </div>
              <div className="progress" style={{ height: '10px' }}>
                <div
                  className={`progress-bar ${getProgressBarClass(statistics.compliantPercentage || 0)}`}
                  style={{ width: `${statistics.compliantPercentage || 0}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <div className="row g-3 align-items-end">
              <div className="col-md-3">
                <label className="form-label small text-muted">Status Filter</label>
                <select
                  className="form-select"
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
              <div className="col-md-3">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setStatusFilter('');
                    setSpecialtyFilter('');
                    setPageNumber(1);
                  }}
                >
                  <i className="bi bi-x-circle me-1"></i>
                  Clear Filters
                </button>
              </div>
              <div className="col-md-6 text-end">
                <button className="btn btn-outline-primary" onClick={fetchData}>
                  <i className="bi bi-arrow-clockwise me-1"></i>
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Doctors Table */}
        <div className="card shadow-sm">
          <div className="card-body p-0">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : complianceData?.data?.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
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
                      <tr key={item.complianceId || item.doctorId}>
                        <td>
                          <div className="d-flex align-items-center">
                            <img
                              src={getAvatarUrl(item.avatarUrl) || '/default-avatar.png'}
                              alt={item.doctorName}
                              className="rounded-circle me-2"
                              style={{ width: '36px', height: '36px', objectFit: 'cover' }}
                              onError={(e) => { e.target.src = '/default-avatar.png'; }}
                            />
                            <div>
                              <div className="fw-medium">{item.doctorName}</div>
                              <small className="text-muted">{item.doctorId}</small>
                            </div>
                          </div>
                        </td>
                        <td>{item.specialty || '-'}</td>
                        <td>
                          <span className="fw-medium">{item.scheduledHours}</span>
                          <span className="text-muted"> / {item.requiredHours}</span>
                        </td>
                        <td style={{ minWidth: '150px' }}>
                          <div className="d-flex align-items-center">
                            <div className="progress flex-grow-1 me-2" style={{ height: '8px' }}>
                              <div
                                className={`progress-bar ${getProgressBarClass(item.compliancePercentage)}`}
                                style={{ width: `${Math.min(item.compliancePercentage, 100)}%` }}
                              />
                            </div>
                            <small className="text-muted">{item.compliancePercentage?.toFixed(0)}%</small>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${getStatusBadgeClass(item.status)}`}>
                            {item.statusDisplay}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${item.scheduleActive ? 'bg-success' : 'bg-danger'}`}>
                            {item.scheduleActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          {item.status !== 'EXEMPTED' && item.status !== 'COMPLIANT' && (
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => {
                                setExemptDoctor(item);
                                setShowExemptModal(true);
                              }}
                            >
                              <i className="bi bi-shield-check me-1"></i>
                              Exempt
                            </button>
                          )}
                          {item.isExempted && (
                            <span className="text-muted small" title={item.exemptReason}>
                              <i className="bi bi-info-circle"></i>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-5">
                <i className="bi bi-inbox display-4 text-muted"></i>
                <p className="text-muted mt-2">No compliance records found for this period</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {complianceData && complianceData.totalPages > 1 && (
            <div className="card-footer d-flex justify-content-between align-items-center">
              <small className="text-muted">
                Showing {((pageNumber - 1) * pageSize) + 1} to {Math.min(pageNumber * pageSize, complianceData.totalElements)} of {complianceData.totalElements}
              </small>
              <nav>
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${!complianceData.hasPrevious ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setPageNumber(p => p - 1)} disabled={!complianceData.hasPrevious}>
                      Previous
                    </button>
                  </li>
                  <li className="page-item active">
                    <span className="page-link">{pageNumber}</span>
                  </li>
                  <li className={`page-item ${!complianceData.hasNext ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setPageNumber(p => p + 1)} disabled={!complianceData.hasNext}>
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Exemption Modal */}
      {showExemptModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Exempt Doctor from Compliance</h5>
                <button type="button" className="btn-close" onClick={() => {
                  setShowExemptModal(false);
                  setExemptDoctor(null);
                  setExemptReason('');
                }}></button>
              </div>
              <div className="modal-body">
                {exemptDoctor && (
                  <div className="mb-3">
                    <p>
                      Exempting <strong>{exemptDoctor.doctorName}</strong> from schedule compliance requirement for <strong>{formatMonth(selectedMonth)}</strong>.
                    </p>
                    <div className="alert alert-warning small">
                      <i className="bi bi-exclamation-triangle me-1"></i>
                      This will mark the doctor's schedule as active regardless of hours scheduled.
                    </div>
                  </div>
                )}
                <div className="mb-3">
                  <label className="form-label">Reason for Exemption *</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={exemptReason}
                    onChange={(e) => setExemptReason(e.target.value)}
                    placeholder="Provide a detailed reason (minimum 10 characters)"
                    required
                  />
                  <small className="text-muted">{exemptReason.length}/500 characters</small>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowExemptModal(false);
                    setExemptDoctor(null);
                    setExemptReason('');
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleExempt}
                  disabled={submitting || exemptReason.trim().length < 10}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1"></span>
                      Processing...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-shield-check me-1"></i>
                      Confirm Exemption
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </NavbarAdmin>
  );
}
