import React, { useState, useEffect, useMemo } from "react";
import NavbarAdmin from "./NavbarAdmin";
import { adminComplianceService } from "../../../api/complianceApi";
import Toast from "./Toast";
import useToast from "../useToast";
import { getAvatarUrl } from "../../../utils/avatarHelper";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../Css/Admin.css";
import "../Css/ScheduleCompliance.css";

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
        <div className="container-fluid py-3">
        {/* Header */}
        <div className="compliance-page-header mb-3">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <div className="compliance-page-icon">
                <i className="bi bi-clipboard-check"></i>
              </div>
              <div>
                <h2 className="compliance-page-title">Schedule Compliance</h2>
                <p className="compliance-page-subtitle mb-0">Monitor and manage doctor schedule compliance</p>
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
                    <tr key={item.complianceId || item.doctorId}>
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
                            <div className="compliance-doctor-id">{item.doctorId}</div>
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
                        {item.status !== 'EXEMPTED' && item.status !== 'COMPLIANT' && (
                          <button
                            className="compliance-action-btn"
                            onClick={() => {
                              setExemptDoctor(item);
                              setShowExemptModal(true);
                            }}
                          >
                            <i className="bi bi-shield-check"></i>
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
        </div>
      </div>

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
