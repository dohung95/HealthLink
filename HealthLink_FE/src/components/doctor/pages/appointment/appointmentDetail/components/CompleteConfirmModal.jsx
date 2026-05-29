import React from 'react';

const CompleteConfirmModal = ({ show, completingAppointment, onClose, onConfirm }) => {
  if (!show) return null;

  return (
    <div className="modal show d-block doctor-detail-modal-overlay" tabIndex="-1">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow-lg">
          <div className="modal-header border-0 pb-0">
            <h5 className="modal-title fw-bold">
              <i className="bi bi-check-circle-fill text-success me-2"></i>
              Confirm completion
            </h5>
          </div>
          <div className="modal-body">
            <p className="mb-0">Are you sure you want to mark this appointment as completed?</p>
          </div>
          <div className="modal-footer border-0 pt-0">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={completingAppointment}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-success"
              onClick={onConfirm}
              disabled={completingAppointment}
            >
              {completingAppointment ? 'Completing...' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompleteConfirmModal;
