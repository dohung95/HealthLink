import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { consultationApi } from '../../api/consultationApi';
import { useNotifications } from '../../context/NotificationContext';
import Toast from '../Admin/View/Toast';
import useToast from '../Admin/useToast';

const HomeVisitProposalModal = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { homeVisitProposal, setHomeVisitProposal } = useNotifications();
  const { toast, showToast, hideToast } = useToast();

  if (!homeVisitProposal) return null;

  const closeModal = () => {
    setHomeVisitProposal(null);
  };

  const handleAccept = async () => {
    try {
      setLoading(true);
      const data = await consultationApi.confirmHomeVisitProposal(homeVisitProposal.consultationId);
      closeModal();
      // Navigate to booking with HomeVisit pre-selected, skip Visit Type step
      navigate(`/book/${data.doctorId}?homeVisit=true&consultationId=${data.consultationId}`);
    } catch (err) {
      showToast({ type: 'error', message: err?.response?.data?.message || 'Failed to accept proposal' });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      setLoading(true);
      await consultationApi.rejectHomeVisitProposal(homeVisitProposal.consultationId);
      closeModal();
    } catch (err) {
      showToast({ type: 'error', message: err?.response?.data?.message || 'Failed to reject proposal' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }} />
      <div className="modal fade show d-block" tabIndex="-1" role="dialog" style={{ zIndex: 1055 }}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header bg-primary text-white">
              <h5 className="modal-title">
                <i className="bi bi-house-heart me-2"></i>Home Visit Proposal
              </h5>
              <button type="button" className="btn-close btn-close-white" onClick={closeModal} aria-label="Close" />
            </div>

            <div className="modal-body text-center py-4">
              <i className="bi bi-house-heart display-3 text-primary mb-3 d-block"></i>
              <p className="mb-1 fw-bold">
                Your doctor has proposed a home visit follow-up.
              </p>
              <p className="text-muted small mb-0">
                A home visit consultation will be scheduled at your preferred time. A flat fee of $150 will be charged.
              </p>
            </div>
            <div className="modal-footer justify-content-center gap-3">
              <button
                className="btn btn-outline-secondary px-4"
                onClick={handleReject}
                disabled={loading}
              >
                Decline
              </button>
              <button
                className="btn btn-primary px-4"
                onClick={handleAccept}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Accept'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
    </>
  );
};

export default HomeVisitProposalModal;
