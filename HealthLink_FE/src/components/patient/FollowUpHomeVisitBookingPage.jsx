import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { consultationApi } from '../../api/consultationApi';
import { paymentApi } from '../../api/paymentApi';
import {
  clearFollowUpHomeVisitAccess,
  hasFollowUpHomeVisitAccess,
} from '../../utils/followUpHomeVisitAccess';
import FollowUpHomeVisitLocationStep from './FollowUpHomeVisitLocationStep';
import FollowUpHomeVisitServicesStep from './FollowUpHomeVisitServicesStep';
import FollowUpHomeVisitConfirmStep from './FollowUpHomeVisitConfirmStep';
import FollowUpHomeVisitPaymentStep from './FollowUpHomeVisitPaymentStep';

const STEP_LOCATION = 'location';
const STEP_SERVICES = 'services';
const STEP_CONFIRM = 'confirm';
const STEP_PAYMENT = 'payment';

const STEPS = [
  { id: STEP_LOCATION, label: 'Location', icon: 'bi-geo-alt' },
  { id: STEP_SERVICES, label: 'Services', icon: 'bi-clipboard2-pulse' },
  { id: STEP_CONFIRM, label: 'Confirm', icon: 'bi-check2-square' },
  { id: STEP_PAYMENT, label: 'Payment', icon: 'bi-credit-card' },
];

const DEFAULT_LOCATION = {
  visitAddress: '',
  visitCity: '',
  contactPhone: '',
  reasonForHomeVisit: '',
  specialNotes: '',
  isForSelf: true,
  receiverName: '',
  receiverAge: '',
  receiverGender: '',
  receiverRelationship: '',
  receiverPhone: '',
  visitLatitude: 10.7769,
  visitLongitude: 106.7009,
};

const normalizeConsultationType = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[\s_-]/g, '');

const isHomeVisitType = (value) => normalizeConsultationType(value) === 'homevisit';

const mapSourceHomeVisitDetails = (details) => ({
  ...DEFAULT_LOCATION,
  visitAddress: details?.visitAddress || '',
  visitCity: details?.visitCity || '',
  contactPhone: details?.contactPhone || '',
  reasonForHomeVisit: details?.reasonForHomeVisit || '',
  specialNotes: details?.specialNotes || '',
  isForSelf: details?.isForSelf !== false,
  receiverName: details?.receiverName || '',
  receiverAge: details?.receiverAge || '',
  receiverGender: details?.receiverGender || '',
  receiverRelationship: details?.receiverRelationship || '',
  receiverPhone: details?.receiverPhone || '',
  visitLatitude: Number(details?.visitLatitude) || DEFAULT_LOCATION.visitLatitude,
  visitLongitude: Number(details?.visitLongitude) || DEFAULT_LOCATION.visitLongitude,
});

const FollowUpHomeVisitBookingPage = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(STEP_LOCATION);
  const [locationDetails, setLocationDetails] = useState(DEFAULT_LOCATION);
  const [selectedServices, setSelectedServices] = useState([]);
  const [savingDetails, setSavingDetails] = useState(false);

  const routeAccessAllowed = useMemo(() => (
    location.state?.fromFollowUpConfirm === true || hasFollowUpHomeVisitAccess(appointmentId)
  ), [appointmentId, location.state]);

  useEffect(() => {
    if (!routeAccessAllowed) {
      navigate('/patient-dashboard/appointments', { replace: true });
    }
  }, [navigate, routeAccessAllowed]);

  const loadStatus = useCallback(async () => {
    if (!appointmentId || !routeAccessAllowed) return;
    setLoading(true);
    setError('');
    try {
      const data = await consultationApi.getFollowUpStatus(appointmentId);
      if (!data || data.status !== 'PENDING_PAYMENT') {
        clearFollowUpHomeVisitAccess(appointmentId);
        navigate('/patient-dashboard/appointments', { replace: true });
        return;
      }
      if (!isHomeVisitType(data.consultationType)) {
        clearFollowUpHomeVisitAccess(appointmentId);
        navigate('/patient-dashboard/appointments', { replace: true });
        return;
      }

      setStatusData(data);

      if (data.hasSourceHomeVisitDetails && data.sourceHomeVisitDetails) {
        setLocationDetails(mapSourceHomeVisitDetails(data.sourceHomeVisitDetails));
        setCurrentStep(STEP_SERVICES);
      } else {
        setLocationDetails(DEFAULT_LOCATION);
        setCurrentStep(STEP_LOCATION);
      }
    } catch (err) {
      console.error('Failed to load follow-up HomeVisit status:', err);
      setError(err.response?.data?.message || 'Could not load follow-up HomeVisit booking.');
    } finally {
      setLoading(false);
    }
  }, [appointmentId, navigate, routeAccessAllowed]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const selectedServiceIds = useMemo(
    () => selectedServices.map((service) => service.serviceId).filter(Boolean),
    [selectedServices],
  );

  const persistFollowUpDetails = useCallback(async () => {
    setSavingDetails(true);
    try {
      const payload = {
        ...locationDetails,
        receiverAge: locationDetails.receiverAge === '' ? null : Number(locationDetails.receiverAge),
        homeVisitServiceIds: selectedServiceIds,
      };
      await paymentApi.saveFollowUpLocation(appointmentId, payload);
      setCurrentStep(STEP_PAYMENT);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save HomeVisit details.');
    } finally {
      setSavingDetails(false);
    }
  }, [appointmentId, locationDetails, selectedServiceIds]);

  const handlePaymentSuccess = useCallback(() => {
    clearFollowUpHomeVisitAccess(appointmentId);
    toast.success('Payment successful. Follow-up appointment created.');
    navigate('/patient-dashboard/appointments', { replace: true });
  }, [appointmentId, navigate]);

  const handleCancel = useCallback(() => {
    clearFollowUpHomeVisitAccess(appointmentId);
    navigate('/patient-dashboard/appointments', { replace: true });
  }, [appointmentId, navigate]);

  if (!routeAccessAllowed) return null;

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="placeholder-glow mx-auto" style={{ maxWidth: '920px' }}>
          <span className="placeholder col-4 d-block mb-3" />
          <span className="placeholder col-12 d-block mb-2" style={{ height: 180 }} />
          <span className="placeholder col-8 d-block" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-4">
        <div className="alert alert-warning" role="alert">
          <i className="bi bi-exclamation-triangle me-2" />
          {error}
        </div>
        <button type="button" className="btn btn-outline-secondary" onClick={handleCancel}>
          Back to appointments
        </button>
      </div>
    );
  }

  const currentIndex = STEPS.findIndex((step) => step.id === currentStep);

  return (
    <div className="container-fluid py-4 follow-up-homevisit-page">
      <div className="mx-auto" style={{ maxWidth: '1120px' }}>
        <div className="d-flex flex-column flex-lg-row justify-content-between gap-3 mb-4">
          <div>
            <p className="text-muted small mb-1">Follow-up HomeVisit</p>
            <h2 className="mb-1">Complete your follow-up booking</h2>
            <p className="text-muted mb-0">
              Confirm location, optional services, and payment for the follow-up requested by your doctor.
            </p>
          </div>
          <button type="button" className="btn btn-outline-secondary align-self-start" onClick={handleCancel}>
            <i className="bi bi-arrow-left me-2" />
            Appointments
          </button>
        </div>

        <div className="d-grid gap-2 mb-4" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
          {STEPS.map((step, index) => (
            <div
              key={step.id}
              className={`border rounded-3 p-3 ${index <= currentIndex ? 'bg-white' : 'bg-light text-muted'}`}
            >
              <i className={`bi ${step.icon} me-2`} />
              <span className="fw-semibold">{step.label}</span>
            </div>
          ))}
        </div>

        {currentStep === STEP_LOCATION && (
          <FollowUpHomeVisitLocationStep
            value={locationDetails}
            onChange={setLocationDetails}
            onBack={handleCancel}
            onNext={() => setCurrentStep(STEP_SERVICES)}
          />
        )}

        {currentStep === STEP_SERVICES && (
          <FollowUpHomeVisitServicesStep
            selectedServices={selectedServices}
            onChange={setSelectedServices}
            onBack={() => {
              if (statusData?.hasSourceHomeVisitDetails) {
                handleCancel();
                return;
              }
              setCurrentStep(STEP_LOCATION);
            }}
            onNext={() => setCurrentStep(STEP_CONFIRM)}
          />
        )}

        {currentStep === STEP_CONFIRM && (
          <FollowUpHomeVisitConfirmStep
            statusData={statusData}
            locationDetails={locationDetails}
            selectedServices={selectedServices}
            saving={savingDetails}
            onBack={() => setCurrentStep(STEP_SERVICES)}
            onConfirm={persistFollowUpDetails}
          />
        )}

        {currentStep === STEP_PAYMENT && (
          <FollowUpHomeVisitPaymentStep
            appointmentId={appointmentId}
            onBack={() => setCurrentStep(STEP_CONFIRM)}
            onSuccess={handlePaymentSuccess}
          />
        )}
      </div>
    </div>
  );
};

export default FollowUpHomeVisitBookingPage;
