import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import { consultationApi } from '../../api/consultationApi';
import { paymentApi } from '../../api/paymentApi';
import { homeVisitApi } from '../../api/homeVisitApi';
import { loadPayPalSdk } from '../../utils/paypalSdk';

const STEP_INFO = 'info';
const STEP_LOCATION = 'location';
const STEP_PAY = 'pay';
const STEP_DONE = 'done';

const FollowUpPaymentModal = ({ show, appointmentId, onClose, onStatusChange }) => {
  const [step, setStep] = useState(STEP_INFO);
  const [statusData, setStatusData] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [visitLat, setVisitLat] = useState('');
  const [visitLng, setVisitLng] = useState('');
  const [address, setAddress] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [services, setServices] = useState([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [estimate, setEstimate] = useState(null);
  const [estimating, setEstimating] = useState(false);
  const [declining, setDeclining] = useState(false);
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
      setVisitLat('');
      setVisitLng('');
      setAddress('');
      setSelectedServiceIds([]);
      setEstimate(null);
      fetchStatus();
    }
  }, [show, fetchStatus]);

  useEffect(() => {
    if (!show || step !== STEP_LOCATION) return;
    homeVisitApi.getServices().then(setServices).catch(() => {});
  }, [show, step]);

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

  const toggleService = (id) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleGeocode = async () => {
    if (!address.trim()) return;
    setGeocoding(true);
    try {
      const results = await homeVisitApi.geocodeAddress(address);
      if (results?.length > 0) {
        setVisitLat(String(results[0].lat));
        setVisitLng(String(results[0].lng));
      } else {
        toast.warning('No results found for this address');
      }
    } catch {
      toast.error('Geocoding failed');
    } finally {
      setGeocoding(false);
    }
  };

  const handleEstimate = async () => {
    if (!visitLat || !visitLng) { toast.warning('Enter location first'); return; }
    setEstimating(true);
    try {
      const est = await homeVisitApi.estimateFee({
        doctorId: statusData?.doctorId,
        visitLatitude: parseFloat(visitLat),
        visitLongitude: parseFloat(visitLng),
      });
      setEstimate(est);
    } catch {
      toast.error('Failed to get estimate');
    } finally {
      setEstimating(false);
    }
  };

  const handleSaveLocation = async () => {
    if (!visitLat || !visitLng) { toast.warning('Enter location'); return; }
    setProcessing(true);
    try {
      await paymentApi.saveFollowUpLocation(appointmentId, {
        visitLatitude: parseFloat(visitLat),
        visitLongitude: parseFloat(visitLng),
        homeVisitServiceIds: selectedServiceIds,
      });
      toast.success('Location saved');
      setStep(STEP_PAY);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save location');
    } finally {
      setProcessing(false);
    }
  };

  const handleProceedToPay = () => {
    if (statusData?.consultationType === 'HomeVisit') {
      setStep(STEP_LOCATION);
    } else {
      setStep(STEP_PAY);
    }
  };

  const handleDecline = async () => {
    setDeclining(true);
    try {
      await consultationApi.denyFollowUp(appointmentId);
      toast.info('Follow-up payment request declined.');
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to decline payment request');
    } finally {
      setDeclining(false);
    }
  };

  if (!show) return null;

  const rightCol = () => {
    switch (step) {
      case STEP_INFO:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button className="btn btn-primary" onClick={handleProceedToPay} style={{ padding: '0.75rem' }}>
              <i className="bi bi-credit-card me-1" /> Proceed to Payment
            </button>
            <button className="btn btn-outline-danger" onClick={handleDecline} disabled={declining} style={{ padding: '0.5rem' }}>
              {declining ? 'Declining...' : <><i className="bi bi-x-circle me-1" /> Decline & Close</>}
            </button>
          </div>
        );
      case STEP_LOCATION:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <input className="form-control" placeholder="Enter address" value={address}
              onChange={(e) => setAddress(e.target.value)} />
            <button className="btn btn-outline-secondary btn-sm" onClick={handleGeocode} disabled={geocoding}>
              {geocoding ? 'Geocoding...' : <><i className="bi bi-geo-alt" /> Find coordinates</>}
            </button>
            <input className="form-control" placeholder="Latitude" type="number" step="any" value={visitLat}
              onChange={(e) => setVisitLat(e.target.value)} />
            <input className="form-control" placeholder="Longitude" type="number" step="any" value={visitLng}
              onChange={(e) => setVisitLng(e.target.value)} />
            <button className="btn btn-outline-secondary btn-sm" onClick={handleEstimate} disabled={estimating}>
              {estimating ? 'Estimating...' : 'Get estimate'}
            </button>
            {estimate && (
              <div style={{ fontSize: '0.85rem', background: '#f5f5f5', padding: '0.5rem', borderRadius: '4px' }}>
                <p style={{ margin: '0 0 0.25rem' }}>Base fee: <strong>${estimate.baseFee}</strong></p>
                <p style={{ margin: '0 0 0.25rem' }}>Distance fee: <strong>${estimate.distanceFee}</strong></p>
                {estimate.servicesTotal > 0 && (
                  <p style={{ margin: '0 0 0.25rem' }}>Services: <strong>${estimate.servicesTotal}</strong></p>
                )}
                <p style={{ margin: 0, fontWeight: 600 }}>Total: <strong>${estimate.total}</strong></p>
              </div>
            )}
            {services.length > 0 && (
              <div style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px', padding: '0.25rem' }}>
                {services.map((svc) => (
                  <label key={svc.serviceId} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={selectedServiceIds.includes(svc.serviceId)}
                      onChange={() => toggleService(svc.serviceId)} />
                    {svc.serviceName} (${svc.price})
                  </label>
                ))}
              </div>
            )}
            <button className="btn btn-primary" onClick={handleSaveLocation} disabled={processing}>
              {processing ? 'Saving...' : <><i className="bi bi-check-lg" /> Save & Continue</>}
            </button>
            <button className="btn btn-outline-secondary btn-sm" onClick={() => setStep(STEP_INFO)} style={{ marginTop: '0.25rem' }}>
              <i className="bi bi-arrow-left me-1" /> Back
            </button>
          </div>
        );
      case STEP_PAY:
        return (
          <>
            <div ref={buttonRef} />
            {processing && <p style={{ textAlign: 'center', margin: 0 }}>Processing payment...</p>}
          </>
        );
      case STEP_DONE:
        return (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--success)', fontWeight: 600, margin: '0 0 0.75rem' }}>
              <i className="bi bi-check-circle-fill me-1" /> Payment complete
            </p>
            <button className="btn btn-success" onClick={onClose}>Close</button>
          </div>
        );
    }
  };

  return createPortal(
    <div className="modal-overlay">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '650px', padding: '2rem', position: 'relative' }}>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <div style={{ flex: 1 }}>
            <h3>Follow-up Payment</h3>
            {statusData && (
              <div>
                <p><strong>Date:</strong> {statusData.followUpDate ? new Date(statusData.followUpDate).toLocaleString() : 'N/A'}</p>
                <p><strong>Notes:</strong> {statusData.followUpNotes || 'N/A'}</p>
                <p><strong>Type:</strong> {statusData.consultationType || 'N/A'}</p>
                {step === STEP_LOCATION && <p style={{ color: '#856404', margin: '0.5rem 0 0', fontSize: '0.85rem' }}>Set your location for the home visit</p>}
              </div>
            )}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', justifyContent: 'center' }}>
            {rightCol()}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default FollowUpPaymentModal;
