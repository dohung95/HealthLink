import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';

const HomeVisitProposalResultModal = () => {
  const navigate = useNavigate();
  const {
    homeVisitProposalResult,
    closeHomeVisitProposalResultModal,
  } = useNotifications();

  if (!homeVisitProposalResult) {
    return null;
  }

  const isAccepted = homeVisitProposalResult.status === 'ACCEPTED';
  const targetPath = homeVisitProposalResult.actionUrl
    || (homeVisitProposalResult.appointmentId
      ? `/doctor/appointments/${homeVisitProposalResult.appointmentId}`
      : null);

  const handleOpen = () => {
    if (!targetPath) {
      closeHomeVisitProposalResultModal();
      return;
    }

    closeHomeVisitProposalResultModal();
    navigate(targetPath);
  };

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }} />
      <div className="modal fade show d-block" tabIndex="-1" role="dialog" style={{ zIndex: 1055 }}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className={`modal-header ${isAccepted ? 'bg-success' : 'bg-warning'} text-white`}>
              <h5 className="modal-title">
                <i className={`bi ${isAccepted ? 'bi-check-circle' : 'bi-exclamation-circle'} me-2`} />
                {homeVisitProposalResult.title}
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={closeHomeVisitProposalResultModal}
                aria-label="Close"
              />
            </div>

            <div className="modal-body text-center py-4">
              <i
                className={`bi ${isAccepted ? 'bi-house-check' : 'bi-house-dash'} display-3 ${
                  isAccepted ? 'text-success' : 'text-warning'
                } mb-3 d-block`}
              />
              <p className="mb-1 fw-bold">
                {homeVisitProposalResult.patientName}
                {' '}
                {isAccepted ? 'accepted' : 'declined'}
                {' '}
                your home visit proposal.
              </p>
              <p className="text-muted small mb-0">
                {homeVisitProposalResult.message}
              </p>
            </div>

            <div className="modal-footer justify-content-center gap-3">
              <button
                className="btn btn-outline-secondary px-4"
                onClick={closeHomeVisitProposalResultModal}
              >
                Close
              </button>
              {targetPath ? (
                <button
                  className={`btn ${isAccepted ? 'btn-success' : 'btn-primary'} px-4`}
                  onClick={handleOpen}
                >
                  Open Appointment
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default HomeVisitProposalResultModal;
