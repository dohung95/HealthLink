import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import { consultationApi } from '../../api/consultationApi';
import { paymentApi } from '../../api/paymentApi';
import { loadPayPalSdk } from '../../utils/paypalSdk';

const STEP_INFO = 'info';
const STEP_PAY = 'pay';
const STEP_DONE = 'done';

const FollowUpPaymentModal = ({ show, appointmentId, onClose, onStatusChange }) => {
  const [step, setStep] = useState(STEP_INFO);
  const [statusData, setStatusData] = useState(null);
  const [processing, setProcessing] = useState(false);
  const buttonRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    if (!appointmentId) return;
    try {
      const data = await consultationApi.getFollowUpStatus(appointmentId);
      setStatusData(data);
      if (!data || data.status !== 'PENDING_PAYMENT') {
        onClose();
      }
    } catch (err) {
      console.error('Error fetching follow-up status:', err);
    }
  }, [appointmentId, onClose]);

  useEffect(() => {
    if (show) {
      setStep(STEP_INFO);
      fetchStatus();
    }
  }, [show, fetchStatus]);

  useEffect(() => {
    if (!show || step !== STEP_PAY || !buttonRef.current) return;

    const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
    if (!clientId) {
      toast.error('PayPal client id is missing. Please set VITE_PAYPAL_CLIENT_ID.');
      return;
    }

    let cancelled = false;
    buttonRef.current.innerHTML = '';

    loadPayPalSdk(clientId)
      .then((paypal) => {
        if (cancelled || !paypal || !buttonRef.current) return;

        paypal.Buttons({
          style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' },
          createOrder: async () => {
            const orderData = await paymentApi.createFollowUpPayPalOrder(appointmentId);
            return orderData.orderId;
          },
          onApprove: async (data) => {
            setProcessing(true);
            try {
              await paymentApi.captureFollowUpPayPalOrder(appointmentId, data.orderID);
              toast.success('Payment successful! Follow-up appointment created.');
              setStep(STEP_DONE);
              if (onStatusChange) onStatusChange('PAID');
            } catch (error) {
              console.error('Payment capture failed:', error);
              toast.error(error.response?.data?.message || 'Failed to capture payment');
            } finally {
              setProcessing(false);
            }
          },
          onCancel: () => {
            toast.warning('Payment was cancelled.');
          },
          onError: (error) => {
            console.error('PayPal error', error);
            toast.error('PayPal could not process this payment.');
          },
        }).render(buttonRef.current);
      })
      .catch((error) => {
        console.error('Could not load PayPal SDK', error);
        toast.error('Could not load PayPal checkout.');
      });

    return () => {
      cancelled = true;
      if (buttonRef.current) {
        buttonRef.current.innerHTML = '';
      }
    };
  }, [show, appointmentId, step, onStatusChange]);

  const handleProceedToPay = () => {
    setStep(STEP_PAY);
  };

  if (!show) return null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '600px', padding: '2rem', position: 'relative' }}>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <div style={{ flex: 1 }}>
            <h3>Follow-up Payment</h3>
            {statusData && (
              <div>
                <p><strong>Date:</strong> {statusData.followUpDate ? new Date(statusData.followUpDate).toLocaleString() : 'N/A'}</p>
                <p><strong>Notes:</strong> {statusData.followUpNotes || 'N/A'}</p>
                <p><strong>Type:</strong> {statusData.consultationType || 'N/A'}</p>
              </div>
            )}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', justifyContent: 'center' }}>
            {step === STEP_INFO && (
              <button className="btn btn-primary" onClick={handleProceedToPay} style={{ padding: '0.75rem' }}>
                <i className="bi bi-credit-card me-1" /> Proceed to Payment
              </button>
            )}
            {step === STEP_PAY && (
              <>
                <div ref={buttonRef} />
                {processing && <p style={{ textAlign: 'center', margin: 0 }}>Processing payment...</p>}
              </>
            )}
            {step === STEP_DONE && (
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: 'var(--success)', fontWeight: 600, margin: '0 0 0.75rem' }}>
                  <i className="bi bi-check-circle-fill me-1" /> Payment complete
                </p>
                <button className="btn btn-success" onClick={onClose}>
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
        <button className="btn-close" onClick={onClose}
          style={{ position: 'absolute', top: '1rem', right: '1rem', border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
      </div>
    </div>,
    document.body
  );
};

export default FollowUpPaymentModal;
