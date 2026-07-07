import React, { useEffect, useRef, useState, useCallback } from 'react';
import { loadPayPalSdk } from '../../utils/paypalSdk';
import { paymentApi } from '../../api/paymentApi';

const FollowUpHomeVisitPaymentStep = ({ appointmentId, onBack, onSuccess }) => {
  const buttonRef = useRef(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleSuccess = useCallback(() => { onSuccess(); }, [onSuccess]);

  useEffect(() => {
    if (!buttonRef.current || !appointmentId) return undefined;

    const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
    if (!clientId) {
      setError('PayPal client id is missing. Please set VITE_PAYPAL_CLIENT_ID.');
      return undefined;
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
              handleSuccess();
            } catch (err) {
              console.error('Follow-up HomeVisit payment capture failed:', err);
              setError(err.response?.data?.message || 'Failed to capture payment.');
            } finally {
              setProcessing(false);
            }
          },
          onCancel: () => {
            setError('Payment was cancelled.');
          },
          onError: (err) => {
            console.error('PayPal follow-up HomeVisit error:', err);
            setError('PayPal could not process this payment.');
          },
        }).render(buttonRef.current);
      })
      .catch((err) => {
        console.error('Could not load PayPal SDK:', err);
        setError('Could not load PayPal checkout.');
      });

    return () => {
      cancelled = true;
      if (buttonRef.current) {
        buttonRef.current.innerHTML = '';
      }
    };
  }, [appointmentId, handleSuccess]);

  return (
    <div className="border rounded-3 p-4 bg-white">
      <h5 className="mb-3"><i className="bi bi-credit-card me-2" />Payment</h5>
      <p className="text-muted small mb-3">Complete payment to confirm your follow-up HomeVisit appointment.</p>

      {error && (
        <div className="alert alert-warning" role="alert">
          <i className="bi bi-exclamation-triangle me-2" />{error}
        </div>
      )}

      <div ref={buttonRef} className="mb-3" />

      {processing && (
        <div className="text-center text-muted">
          <span className="spinner-border spinner-border-sm me-2" role="status" />
          Processing payment...
        </div>
      )}

      <div className="mt-3">
        <button type="button" className="btn btn-outline-secondary" onClick={onBack} disabled={processing}>
          <i className="bi bi-arrow-left me-2" />Back
        </button>
      </div>
    </div>
  );
};

export default FollowUpHomeVisitPaymentStep;
