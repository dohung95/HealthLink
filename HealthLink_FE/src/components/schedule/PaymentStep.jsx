import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { paymentApi } from '../../api/paymentApi';
import { loadPayPalSdk } from '../../utils/paypalSdk';

const formatCurrency = (value) => {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const PaymentStep = ({ bookingDraft, selectedDoctor, onBack, onPaymentComplete }) => {
  const buttonRef = useRef(null);
  const orderCreationErrorRef = useRef(false);
  const [loadingSdk, setLoadingSdk] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paidInvoice, setPaidInvoice] = useState(null);

  useEffect(() => {
    if (!bookingDraft || !buttonRef.current || paidInvoice) {
      return;
    }

    const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
    if (!clientId) {
      toast.error('PayPal client id is missing. Please set VITE_PAYPAL_CLIENT_ID.');
      return;
    }

    let cancelled = false;
    buttonRef.current.innerHTML = '';
    setLoadingSdk(true);

    loadPayPalSdk(clientId)
      .then((paypal) => {
        if (cancelled || !paypal || !buttonRef.current) return;

        paypal.Buttons({
          style: {
            layout: 'vertical',
            color: 'gold',
            shape: 'rect',
            label: 'paypal',
          },
          createOrder: async () => {
            try {
              const order = await paymentApi.createAppointmentPayPalOrder(bookingDraft);
              return order.orderId;
            } catch (error) {
              console.error('Payment order creation failed', error);
              orderCreationErrorRef.current = true;
              toast.error(error.response?.data?.message || 'Can not create PayPal payment order.');
              throw error;
            }
          },
          onApprove: async (data) => {
            setProcessing(true);
            try {
              const capturedInvoice = await paymentApi.captureAppointmentPayPalPayment(
                bookingDraft,
                data.orderID,
                'EWallet'
              );
              setPaidInvoice(capturedInvoice);
              toast.success('Payment successful.');
            } catch (error) {
              console.error('Payment capture failed', error);
              toast.error(error.response?.data?.message || 'Payment could not be captured.');
            } finally {
              setProcessing(false);
            }
          },
          onCancel: () => {
            toast.warning('Payment was cancelled.');
          },
          onError: (error) => {
            console.error('PayPal error', error);
            if (orderCreationErrorRef.current) {
              orderCreationErrorRef.current = false;
              return;
            }
            toast.error('PayPal could not process this payment.');
          },
        }).render(buttonRef.current);
      })
      .catch((error) => {
        console.error('Could not load PayPal SDK', error);
        toast.error('Could not load PayPal checkout.');
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingSdk(false);
        }
      });

    return () => {
      cancelled = true;
      if (buttonRef.current) {
        buttonRef.current.innerHTML = '';
      }
    };
  }, [bookingDraft, paidInvoice]);

  const isHomeVisit = bookingDraft?.consultationType === 'HomeVisit';
  const homeVisitEstimate = bookingDraft?.homeVisitEstimate;

  const draftInvoice = {
    invoiceNumber: 'Pending checkout',
    amount: bookingDraft?.amount ?? selectedDoctor?.consultationFee ?? 0,
    consultationFee: bookingDraft?.doctorFee ?? selectedDoctor?.consultationFee ?? 0,
    homeVisitBaseFee: homeVisitEstimate?.homeVisitFee,
    travelFee: homeVisitEstimate?.travelFee,
    homeVisitTravelTotal: homeVisitEstimate?.totalFee,
    homeVisitServicesTotal: homeVisitEstimate?.servicesTotal ?? 0,
    distanceKm: homeVisitEstimate?.distanceKm,
    estimatedTravelMinutes: homeVisitEstimate?.estimatedTravelMinutes,
    status: 'Pending',
  };

  const displayInvoice = paidInvoice
    ? {
      ...draftInvoice,
      ...paidInvoice,
      consultationFee: paidInvoice.consultationFee ?? draftInvoice.consultationFee,
      homeVisitBaseFee: paidInvoice.homeVisitBaseFee ?? draftInvoice.homeVisitBaseFee,
      travelFee: paidInvoice.travelFee ?? draftInvoice.travelFee,
      homeVisitTravelTotal: paidInvoice.homeVisitTravelTotal ?? draftInvoice.homeVisitTravelTotal,
      homeVisitServicesTotal: paidInvoice.homeVisitServicesTotal ?? draftInvoice.homeVisitServicesTotal,
    }
    : draftInvoice;

  const homeVisitDoctorFee = isHomeVisit
    ? Math.max(
      0,
      Number(displayInvoice?.amount || 0) -
      Number(displayInvoice?.homeVisitTravelTotal || 0) -
      Number(displayInvoice?.homeVisitServicesTotal || 0)
    )
    : Number(displayInvoice?.consultationFee || 0);

  return (
    <div className="schedule-card payment-step-card">
      <h2>Payment</h2>
      <p className="schedule-card-subtitle">
        Your appointment will only be created after payment is completed successfully.
      </p>

      <div className="payment-summary">
        <div>
          <span>Invoice</span>
          <strong>{displayInvoice?.invoiceNumber || `#${displayInvoice?.invoiceId || ''}`}</strong>
        </div>
        <div>
          <span>Appointment</span>
          <strong>{paidInvoice?.appointmentId ? `#${paidInvoice.appointmentId}` : 'Created after payment'}</strong>
        </div>
        <div>
          <span>Doctor</span>
          <strong>{selectedDoctor?.fullName || displayInvoice?.doctorName || 'Doctor'}</strong>
        </div>
        {isHomeVisit && (
          <>
            <div>
              <span>Doctor fee</span>
              <strong>{formatCurrency(homeVisitDoctorFee)}</strong>
            </div>

            <div>
              <span>Home visit travel total</span>
              <strong>{formatCurrency(displayInvoice?.homeVisitTravelTotal)}</strong>
            </div>

            <div>
              <span>Selected services</span>
              <strong>{formatCurrency(displayInvoice?.homeVisitServicesTotal)}</strong>
            </div>

            <div>
              <span>Distance</span>
              <strong>{displayInvoice?.distanceKm ?? 0} km</strong>
            </div>
          </>
        )}
        <div>
          <span>Total</span>
          <strong>{formatCurrency(displayInvoice?.amount)}</strong>
        </div>
      </div>

      <div className="paypal-button-shell">
        {loadingSdk && <div className="payment-inline-state">Loading PayPal...</div>}
        {processing && <div className="payment-inline-state">Capturing payment...</div>}
        <div ref={buttonRef} />
      </div>

      {!paidInvoice && (
        <div className="schedule-actions payment-step-actions">
          <button
            type="button"
            className="btn-outline-soft"
            onClick={onBack}
            disabled={processing}
          >
            ← Back to confirmation
          </button>
        </div>
      )}

      {paidInvoice && (
        <div className="payment-modal-backdrop" role="dialog" aria-modal="true">
          <div className="payment-invoice-modal">
            <div className="payment-modal-header">
              <div>
                <span className="payment-success-icon">
                  <i className="bi bi-check-lg"></i>
                </span>
                <h3>Payment Receipt</h3>
              </div>
              <button
                type="button"
                aria-label="Close receipt"
                onClick={() => onPaymentComplete(paidInvoice)}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div className="payment-receipt-list">
              <div>
                <span>Invoice ID</span>
                <strong>{paidInvoice.invoiceNumber || paidInvoice.invoiceId}</strong>
              </div>
              <div>
                <span>Paid at</span>
                <strong>{paidInvoice.paidAt ? new Date(paidInvoice.paidAt).toLocaleString('en-US') : '-'}</strong>
              </div>
              <div>
                <span>{isHomeVisit ? 'Doctor fee' : 'Consultation fee'}</span>
                <strong>
                  {formatCurrency(isHomeVisit ? homeVisitDoctorFee : displayInvoice?.consultationFee)}
                </strong>
              </div>

              {isHomeVisit && (
                <>
                  <div>
                    <span>Home visit travel total</span>
                    <strong>{formatCurrency(displayInvoice?.homeVisitTravelTotal)}</strong>
                  </div>

                  {Number(displayInvoice?.homeVisitServicesTotal || 0) > 0 && (
                    <div>
                      <span>Selected services</span>
                      <strong>{formatCurrency(displayInvoice?.homeVisitServicesTotal)}</strong>
                    </div>
                  )}
                </>
              )}

              <div>
                <span>Total paid</span>
                <strong>{formatCurrency(paidInvoice.amount)}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong className="text-success">{paidInvoice.status}</strong>
              </div>
              {!isHomeVisit && (
                <div className="payment-success-note">
                  <i className="bi bi-heart-pulse"></i>
                  <span>
                    Before your online consultation, please measure basic vitals such as heart rate,
                    temperature, blood pressure and SpO2 if available. Sharing these readings helps
                    the doctor save time and prepare better for your consultation.
                  </span>
                </div>
              )}
            </div>

            <button
              type="button"
              className="btn-primary-soft payment-modal-action"
              onClick={() => onPaymentComplete(paidInvoice)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentStep;
