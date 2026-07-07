import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import { consultationApi } from '../../api/consultationApi';

const normalizeConsultationType = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[\s_-]/g, '');

const isHomeVisitType = (value) => normalizeConsultationType(value) === 'homevisit';

const formatFollowUpDate = (value) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleString();
};

const FollowUpHomeVisitConfirmModal = ({
  show,
  appointmentId,
  onClose,
  onContinueHomeVisit,
  onContinueLegacyPayment,
}) => {
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [error, setError] = useState('');

  const reset = useCallback(() => {
    setStatusData(null);
    setLoading(false);
    setDeclining(false);
    setError('');
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!appointmentId) return;
    setLoading(true);
    setError('');
    try {
      const data = await consultationApi.getFollowUpStatus(appointmentId);
      setStatusData(data);
      if (!data || data.status !== 'PENDING_PAYMENT') {
        setError('This follow-up request is no longer waiting for payment.');
      }
    } catch (err) {
      console.error('Error fetching follow-up status:', err);
      setError(err.response?.data?.message || 'Could not load follow-up request.');
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    if (!show) {
      reset();
      return;
    }
    fetchStatus();
  }, [show, fetchStatus, reset]);

  const isHomeVisit = useMemo(
    () => isHomeVisitType(statusData?.consultationType),
    [statusData?.consultationType],
  );

  const handleAccept = () => {
    if (!statusData || statusData.status !== 'PENDING_PAYMENT') return;
    if (isHomeVisit) {
      onContinueHomeVisit(appointmentId, statusData);
      return;
    }
    onContinueLegacyPayment(appointmentId);
  };

  const handleDecline = async () => {
    if (!appointmentId) return;
    setDeclining(true);
    try {
      await consultationApi.denyFollowUp(appointmentId);
      toast.info('Follow-up payment request declined.');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to decline payment request.');
    } finally {
      setDeclining(false);
    }
  };

  if (!show) return null;

  return createPortal(
    <div className="modal-overlay">
      <div
        className="modal-content"
        onClick={(event) => event.stopPropagation()}
        style={{ maxWidth: '560px', padding: '1.5rem', position: 'relative' }}
      >
        <button
          type="button"
          className="btn-close position-absolute top-0 end-0 m-3"
          aria-label="Close"
          onClick={onClose}
        />
        <div className="d-flex flex-column gap-3">
          <div>
            <p className="text-muted small mb-1">Follow-up request</p>
            <h3 className="mb-1">Review follow-up payment</h3>
            <p className="mb-0 text-muted">
              Your doctor scheduled a follow-up appointment. Review the details before continuing.
            </p>
          </div>

          {loading && (
            <div className="placeholder-glow" aria-live="polite">
              <span className="placeholder col-8 d-block mb-2" />
              <span className="placeholder col-6 d-block" />
            </div>
          )}

          {!loading && error && (
            <div className="alert alert-warning mb-0" role="alert">
              <i className="bi bi-exclamation-triangle me-2" />
              {error}
            </div>
          )}

          {!loading && statusData && !error && (
            <div className="border rounded-3 p-3 bg-light">
              <div className="d-flex justify-content-between gap-3 mb-2">
                <span className="text-muted">Date</span>
                <strong className="text-end">{formatFollowUpDate(statusData.followUpDate)}</strong>
              </div>
              <div className="d-flex justify-content-between gap-3 mb-2">
                <span className="text-muted">Type</span>
                <strong>{statusData.consultationType || 'N/A'}</strong>
              </div>
              <div className="text-muted small">{statusData.followUpNotes || 'No notes provided.'}</div>
            </div>
          )}

          <div className="d-grid gap-2">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleAccept}
              disabled={loading || declining || Boolean(error)}
            >
              <i className="bi bi-check2-circle me-2" />
              {isHomeVisit ? 'Choose HomeVisit details' : 'Continue to payment'}
            </button>
            <button
              type="button"
              className="btn btn-outline-danger"
              onClick={handleDecline}
              disabled={loading || declining || !statusData}
            >
              <i className="bi bi-x-circle me-2" />
              {declining ? 'Declining...' : 'Decline request'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default FollowUpHomeVisitConfirmModal;
