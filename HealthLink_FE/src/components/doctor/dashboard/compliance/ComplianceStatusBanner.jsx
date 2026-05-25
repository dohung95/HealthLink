import React, { useState, useEffect } from 'react';
import { doctorComplianceService } from '../../../../api/complianceApi';
import { toast } from 'sonner';

const ComplianceStatusBanner = ({ onValidateClick }) => {
  const [complianceData, setComplianceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchComplianceStatus();
  }, []);

  const fetchComplianceStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await doctorComplianceService.getComplianceStatus();
      setComplianceData(data);
    } catch (err) {
      console.error('Error fetching compliance status:', err);
      setError(err.response?.data?.message || 'Failed to load compliance status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLIANT':
        return 'success';
      case 'IN_PROGRESS':
        return 'warning';
      case 'PENDING':
        return 'info';
      case 'NON_COMPLIANT':
        return 'danger';
      case 'EXEMPTED':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'COMPLIANT':
        return 'check_circle';
      case 'IN_PROGRESS':
        return 'pending';
      case 'PENDING':
        return 'schedule';
      case 'NON_COMPLIANT':
        return 'error';
      case 'EXEMPTED':
        return 'verified_user';
      default:
        return 'info';
    }
  };

  const formatMonth = (monthStr) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="card mb-4">
        <div className="card-body d-flex align-items-center justify-content-center py-3">
          <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <span className="text-muted">Loading compliance status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-warning mb-4 d-flex align-items-center" role="alert">
        <span className="material-symbols-outlined me-2">warning</span>
        <span>{error}</span>
        <button className="btn btn-sm btn-outline-warning ms-auto" onClick={fetchComplianceStatus}>
          Retry
        </button>
      </div>
    );
  }

  if (!complianceData) return null;

  const currentMonth = complianceData;
  const nextMonth = complianceData.nextMonthStatus;
  const statusColor = getStatusColor(currentMonth.status);
  const percentage = Math.min(currentMonth.compliancePercentage || 0, 100);

  return (
    <div className={`card border-${statusColor} mb-4`}>
      <div className="card-header bg-transparent d-flex align-items-center justify-content-between py-3">
        <div className="d-flex align-items-center">
          <span className={`material-symbols-outlined text-${statusColor} me-2`} style={{ fontSize: '24px' }}>
            {getStatusIcon(currentMonth.status)}
          </span>
          <div>
            <h6 className="mb-0">Schedule Compliance - {formatMonth(currentMonth.complianceMonth)}</h6>
            <small className="text-muted">{currentMonth.statusMessage}</small>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          {currentMonth.status !== 'COMPLIANT' && currentMonth.status !== 'EXEMPTED' && (
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={onValidateClick}
            >
              <span className="material-symbols-outlined me-1" style={{ fontSize: '16px', verticalAlign: 'middle' }}>
                check_circle
              </span>
              Validate
            </button>
          )}
          <button
            className="btn btn-sm btn-link text-muted p-0"
            onClick={() => setExpanded(!expanded)}
          >
            <span className="material-symbols-outlined">
              {expanded ? 'expand_less' : 'expand_more'}
            </span>
          </button>
        </div>
      </div>

      <div className="card-body py-3">
        {/* Progress Bar */}
        <div className="mb-3">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <span className="small">
              <strong>{currentMonth.scheduledHours || 0}</strong> / {currentMonth.requiredHours || 0} hours scheduled
            </span>
            <span className={`badge bg-${statusColor}`}>
              {percentage.toFixed(0)}%
            </span>
          </div>
          <div className="progress" style={{ height: '8px' }}>
            <div
              className={`progress-bar bg-${statusColor}`}
              role="progressbar"
              style={{ width: `${percentage}%` }}
              aria-valuenow={percentage}
              aria-valuemin="0"
              aria-valuemax="100"
            />
          </div>
        </div>

        {/* Schedule Active Status */}
        <div className="d-flex align-items-center gap-2">
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: currentMonth.scheduleActive ? '#198754' : '#dc3545' }}>
            {currentMonth.scheduleActive ? 'toggle_on' : 'toggle_off'}
          </span>
          <span className="small">
            Schedule is <strong>{currentMonth.scheduleActive ? 'Active' : 'Inactive'}</strong>
            {!currentMonth.scheduleActive && currentMonth.status !== 'EXEMPTED' && (
              <span className="text-muted"> - Add more hours to activate</span>
            )}
          </span>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && nextMonth && (
        <div className="card-footer bg-light">
          <h6 className="small text-muted mb-2">
            Next Month: {formatMonth(nextMonth.complianceMonth)}
          </h6>
          <div className="d-flex justify-content-between align-items-center">
            <span className="small">
              <strong>{nextMonth.scheduledHours || 0}</strong> / {nextMonth.requiredHours || 0} hours
            </span>
            <span className={`badge bg-${getStatusColor(nextMonth.status)}`}>
              {(nextMonth.compliancePercentage || 0).toFixed(0)}%
            </span>
          </div>
          <div className="progress mt-1" style={{ height: '6px' }}>
            <div
              className={`progress-bar bg-${getStatusColor(nextMonth.status)}`}
              role="progressbar"
              style={{ width: `${Math.min(nextMonth.compliancePercentage || 0, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplianceStatusBanner;
