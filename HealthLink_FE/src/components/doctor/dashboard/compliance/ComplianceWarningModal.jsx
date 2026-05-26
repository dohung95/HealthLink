import React from 'react';

const ComplianceWarningModal = ({
  isOpen,
  onClose,
  validationResult,
  onAddMoreHours,
  onSaveAnyway,
}) => {
  if (!isOpen || !validationResult) return null;

  const {
    compliant,
    complianceMonth,
    requiredHours,
    scheduledHours,
    hoursShortfall,
    compliancePercentage,
    status,
    scheduleActive,
    message,
    warnings = [],
    suggestions = [],
  } = validationResult;

  const formatMonth = (monthStr) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const percentage = Math.min(compliancePercentage || 0, 100);

  return (
    <div
      className="modal fade show"
      style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          {/* Header */}
          <div className={`modal-header bg-${compliant ? 'success' : 'warning'} text-${compliant ? 'white' : 'dark'}`}>
            <h5 className="modal-title d-flex align-items-center">
              <span className="material-symbols-outlined me-2">
                {compliant ? 'check_circle' : 'warning'}
              </span>
              {compliant ? 'Schedule Validated' : 'Schedule Compliance Warning'}
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            />
          </div>

          {/* Body */}
          <div className="modal-body">
            {/* Status Message */}
            <div className={`alert alert-${compliant ? 'success' : 'warning'} mb-3`}>
              <p className="mb-0">{message}</p>
            </div>

            {/* Progress Info */}
            <div className="mb-4">
              <h6 className="text-muted mb-2">{formatMonth(complianceMonth)} Status</h6>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span>
                  <strong>{scheduledHours}</strong> / {requiredHours} hours
                </span>
                <span className={`badge bg-${compliant ? 'success' : 'warning'}`}>
                  {percentage.toFixed(0)}%
                </span>
              </div>
              <div className="progress" style={{ height: '12px' }}>
                <div
                  className={`progress-bar bg-${compliant ? 'success' : 'warning'}`}
                  role="progressbar"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>

            {/* Hours Shortfall */}
            {!compliant && hoursShortfall > 0 && (
              <div className="alert alert-danger d-flex align-items-center mb-3">
                <span className="material-symbols-outlined me-2">schedule</span>
                <span>
                  You need <strong>{parseFloat(hoursShortfall).toFixed(1)} more hours</strong> to meet the requirement.
                </span>
              </div>
            )}

            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="mb-3">
                <h6 className="text-danger">
                  <span className="material-symbols-outlined me-1" style={{ fontSize: '18px', verticalAlign: 'middle' }}>
                    error
                  </span>
                  Warnings
                </h6>
                <ul className="list-unstyled mb-0">
                  {warnings.map((warning, index) => (
                    <li key={index} className="text-muted small mb-1">
                      <span className="material-symbols-outlined me-1" style={{ fontSize: '14px', verticalAlign: 'middle' }}>
                        arrow_right
                      </span>
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="mb-3">
                <h6 className="text-info">
                  <span className="material-symbols-outlined me-1" style={{ fontSize: '18px', verticalAlign: 'middle' }}>
                    lightbulb
                  </span>
                  Suggestions
                </h6>
                <ul className="list-unstyled mb-0">
                  {suggestions.map((suggestion, index) => (
                    <li key={index} className="text-muted small mb-1">
                      <span className="material-symbols-outlined me-1" style={{ fontSize: '14px', verticalAlign: 'middle' }}>
                        arrow_right
                      </span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Schedule Active Status */}
            <div className={`card ${scheduleActive ? 'border-success' : 'border-danger'}`}>
              <div className="card-body py-2 d-flex align-items-center">
                <span
                  className="material-symbols-outlined me-2"
                  style={{ color: scheduleActive ? '#198754' : '#dc3545' }}
                >
                  {scheduleActive ? 'toggle_on' : 'toggle_off'}
                </span>
                <div>
                  <strong>Schedule Status: {scheduleActive ? 'Active' : 'Inactive'}</strong>
                  <br />
                  <small className="text-muted">
                    {scheduleActive
                      ? 'Patients can book appointments with you.'
                      : 'Patients cannot book appointments until you meet the minimum hours.'}
                  </small>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            {compliant ? (
              <button type="button" className="btn btn-success" onClick={onClose}>
                <span className="material-symbols-outlined me-1" style={{ fontSize: '18px', verticalAlign: 'middle' }}>
                  check
                </span>
                Great, Close
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={onSaveAnyway}
                >
                  Save Anyway (Inactive)
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={onAddMoreHours}
                >
                  <span className="material-symbols-outlined me-1" style={{ fontSize: '18px', verticalAlign: 'middle' }}>
                    add_circle
                  </span>
                  Add More Hours
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplianceWarningModal;
