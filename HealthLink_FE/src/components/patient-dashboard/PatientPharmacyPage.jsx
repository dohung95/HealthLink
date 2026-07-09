import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import pharmacyApi from '../../api/pharmacyApi';
import { getProfile } from '../../api/account';
import { paymentApi } from '../../api/paymentApi';
import { loadPayPalSdk } from '../../utils/paypalSdk';
import { titleCase } from '../../utils/pharmacy/pharmacyHelpers';
import {
  clearWorkflowToastSuppression,
  getWorkflowToastId,
  suppressWorkflowToast,
} from '../../utils/notificationToastPolicy';
import ConfirmModal from '../ConfirmModal';
import RetailPharmacyStore from './pharmacy-store/RetailPharmacyStore';
import './PatientPharmacy.css';

function isPrescriptionBasedOrder(order) {
  return Boolean(order?.prescriptionHeaderId)
    || (order?.items || []).some((item) => item?.sourcePrescriptionItemId);
}

function shouldShowPaymentBadge(order) {
  if (!order?.paymentStatus) return false;
  const status = String(order.status || '').toUpperCase();
  const paymentStatus = String(order.paymentStatus || '').toUpperCase();
  if (status === 'CANCELLED' && paymentStatus === 'CANCELLED') return false;
  if (status === 'REFUNDED' && paymentStatus === 'REFUNDED') return false;
  return true;
}

function paymentBadgeClass(paymentStatus) {
  const normalized = String(paymentStatus || '').toUpperCase();
  if (normalized === 'PAID') return 'bg-success';
  if (normalized === 'CANCELLED' || normalized === 'FAILED' || normalized === 'REFUNDED') return 'bg-secondary';
  return 'bg-warning';
}

const TABS = [
  { label: 'Store', icon: 'bi-bag', path: '' },
  { label: 'Consult', icon: 'bi-chat-square-text', path: '/consult' },
  { label: 'Requests', icon: 'bi-chat-square-text', path: '/requests' },
  { label: 'Orders', icon: 'bi-box-seam', path: '/orders' },
];

const WIZARD_STEPS = ['prescription', 'pharmacy', 'connect', 'payment'];

function getActiveTab(location) {
  const p = location.pathname.replace(/\/+$/, '');
  if (p.endsWith('/consult')) return '/consult';
  if (p.endsWith('/requests')) return '/requests';
  if (p.includes('/orders/')) return '/orders';
  if (p.endsWith('/orders')) return '/orders';
  return '';
}

export default function PatientPharmacyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUserId: userId } = useAuth();
  const activeTab = getActiveTab(location);
  const isOrderDetail = location.pathname.includes('/orders/') && location.pathname.match(/\/orders\/([^/]+)$/);
  const orderId = isOrderDetail ? location.pathname.match(/\/orders\/([^/]+)$/)[1] : null;

  if (orderId) {
    return <OrderDetailView orderId={orderId} navigate={navigate} />;
  }

  return (
    <div className="patient-pharmacy-page">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h3 className="mb-0">Pharmacy</h3>
      </div>

      <ul className="nav nav-tabs mb-4">
        {TABS.map((t) => (
          <li className="nav-item" key={t.path}>
            <Link
              className={`nav-link ${activeTab === t.path ? 'active' : ''}`}
              to={`/patient-dashboard/pharmacy${t.path}`}
            >
              <i className={`bi ${t.icon} me-2`}></i>{t.label}
            </Link>
          </li>
        ))}
      </ul>

      {activeTab === '/consult' ? (
        <PharmacyWizard userId={userId} navigate={navigate} location={location} />
      ) : activeTab === '/requests' ? (
        <RequestsView userId={userId} />
      ) : activeTab === '/orders' ? (
        <OrdersView userId={userId} navigate={navigate} />
      ) : (
        <RetailPharmacyStore navigate={navigate} />
      )}
    </div>
  );
}

function PharmacyWizard({ userId, navigate, location }) {
  const autoSelectId = location?.state?.autoSelectPrescriptionId;
  const [flowType, setFlowType] = useState('ORDER_REQUEST');
  const [step, setStep] = useState(autoSelectId ? 'fulfillment' : 'prescription');
  const [prescriptionHeaderId, setPrescriptionHeaderId] = useState(autoSelectId || null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);
  const [request, setRequest] = useState(null);
  const [geolocation, setGeolocation] = useState(null);
  const [geoTried, setGeoTried] = useState(false);
  const [patientProfile, setPatientProfile] = useState(null);
  const [deliveryContact, setDeliveryContact] = useState(null);
  const [fulfillmentType, setFulfillmentType] = useState('Delivery');
  const [pickupArea, setPickupArea] = useState({
    address: '',
    latitude: null,
    longitude: null,
    source: 'MANUAL',
  });
  const steps = flowType === 'CONSULTATION' ? ['prescription', 'fulfillment', 'pharmacy', 'connect'] : ['prescription', 'fulfillment', 'pharmacy', 'submitted'];
  const stepIndex = steps.indexOf(step);

  useEffect(() => {
    if (!geoTried && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setGeolocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeoTried(true); },
        () => { setGeoTried(true); },
        { timeout: 5000 }
      );
    } else {
      setGeoTried(true);
    }
  }, [geoTried]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    getProfile(token)
      .then(setPatientProfile)
      .catch(() => setPatientProfile(null));
  }, []);

  const handleSelectPrescription = (id) => {
    setFlowType('ORDER_REQUEST');
    setPrescriptionHeaderId(id);
    setStep('fulfillment');
  };

  const handleSkipPrescription = () => {
    setFlowType('CONSULTATION');
    setPrescriptionHeaderId(null);
    setStep('fulfillment');
  };

  const handleSelectPharmacy = async (pharmacy) => {
    setSelectedPharmacy(pharmacy);

    try {
      const isOrderRequest = flowType === 'ORDER_REQUEST';
      const payload = {
        patientId: userId,
        pharmacyId: pharmacy.pharmacyId,
        requestType: flowType,
        preferredDeliveryType: fulfillmentType,
        deliveryType: fulfillmentType,
        deliveryAddress: deliveryContact?.deliveryAddress,
        deliveryLatitude: deliveryContact?.deliveryLatitude,
        deliveryLongitude: deliveryContact?.deliveryLongitude,
        deliveryPhoneNumber: deliveryContact?.deliveryPhoneNumber,
        deliveryAddressSource: deliveryContact?.deliveryAddressSource,
        ...(isOrderRequest && { prescriptionHeaderIds: [prescriptionHeaderId] }),
        ...(!isOrderRequest && { prescriptionHeaderIds: [] }),
      };
      const created = await pharmacyApi.createConsultationRequest(payload);

      if (isOrderRequest) {
        if (created.pharmacyOrderId) {
          if (fulfillmentType === 'Delivery') {
            toast.success('Order placed. Waiting for pharmacy to confirm delivery.');
          } else {
            toast.success('Order confirmed. Ready for pickup at the pharmacy.');
          }
          navigate(`/patient-dashboard/pharmacy/orders/${created.pharmacyOrderId}`);
        } else {
          toast.success('Request sent for pharmacy review.');
          navigate('/patient-dashboard/pharmacy/requests');
        }
        return;
      }

      setRequest(created);
      setStep('connect');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create consultation request.');
      setStep('pharmacy');
    }
  };

  const handleGoBack = () => {
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]);
  };

  const handleRequestUpdated = (updatedRequest) => {
    setRequest(updatedRequest);
    if (updatedRequest.status === 'ORDER_CREATED' && updatedRequest.pharmacyOrderId) {
      navigate(`/patient-dashboard/pharmacy/orders/${updatedRequest.pharmacyOrderId}`);
    }
  };

  if (stepIndex === -1) return null;

  return (
    <div>
      <div className="d-flex align-items-center gap-2 mb-4">
        {steps.map((s, i) => (
          <div key={s} className="d-flex align-items-center gap-1">
            <div className={`rounded-circle d-flex align-items-center justify-content-center ${i <= stepIndex ? 'bg-primary text-white' : 'bg-light text-muted'}`}
              style={{ width: 28, height: 28, fontSize: 12, fontWeight: 600 }}>
              {i + 1}
            </div>
            <small className={i <= stepIndex ? 'fw-medium' : 'text-muted'}>
              {s === 'prescription' ? 'Prescription' : s === 'fulfillment' ? 'Fulfillment' : s === 'pharmacy' ? 'Pharmacy' : s === 'connect' ? 'Connect' : s === 'submitted' ? 'Submitted' : 'Payment'}
            </small>
            {i < steps.length - 1 && <div className="border-top mx-1" style={{ width: 20 }} />}
          </div>
        ))}
      </div>

      {step === 'prescription' && (
        <PrescriptionStep
          mode={flowType}
          userId={userId}
          onSelect={handleSelectPrescription}
          onSkip={handleSkipPrescription}
          prescriptions={prescriptions}
          setPrescriptions={setPrescriptions}
        />
      )}

      {step === 'fulfillment' && (
        <FulfillmentStep
          profile={patientProfile}
          geolocation={geolocation}
          geoTried={geoTried}
          fulfillmentType={fulfillmentType}
          setFulfillmentType={setFulfillmentType}
          pickupArea={pickupArea}
          setPickupArea={setPickupArea}
          onBack={handleGoBack}
          onContinue={(contact) => {
            setDeliveryContact(contact);
            setStep('pharmacy');
          }}
        />
      )}

      {step === 'pharmacy' && (
        <PharmacySelectionStep
          userId={userId}
          geolocation={geolocation}
          deliveryContact={deliveryContact}
          prescriptionHeaderId={prescriptionHeaderId}
          fulfillmentType={fulfillmentType}
          onSelect={handleSelectPharmacy}
          onBack={handleGoBack}
        />
      )}

      {step === 'connect' && (
        <ConnectStep
          request={request}
          pharmacy={selectedPharmacy}
          geolocation={geolocation}
          userId={userId}
          onRequestUpdated={handleRequestUpdated}
          onBack={handleGoBack}
        />
      )}
    </div>
  );
}

function PrescriptionStep({ mode, userId, onSelect, onSkip, prescriptions, setPrescriptions }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    import('../../api/prescriptionApi')
      .then((mod) => mod.prescriptionService.getMyPrescriptions())
      .then((data) => { setPrescriptions(Array.isArray(data) ? data : []); })
      .catch(() => { setPrescriptions([]); })
      .finally(() => setLoading(false));
  }, [userId, setPrescriptions]);

  return (
    <div>
      <h5 className="fw-semibold mb-1">Do you have a prescription?</h5>
      <p className="text-muted small mb-3">Select an existing prescription or skip to browse pharmacies without one.</p>

      {loading ? (
        <div className="text-center py-4">
          <div className="spinner-border text-primary" role="status" />
        </div>
      ) : prescriptions.length > 0 ? (
        <div className="list-group mb-3">
          {prescriptions.map((rx) => (
            <button key={rx.prescriptionHeaderID} className="list-group-item list-group-item-action text-start"
              onClick={() => onSelect(rx.prescriptionHeaderID)}>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <strong>{rx.doctorName || 'Doctor'}</strong>
                  <p className="mb-0 small text-muted">{new Date(rx.issueDate).toLocaleDateString()} - {rx.diagnosis || 'No diagnosis'}</p>
                </div>
                <i className="bi bi-chevron-right text-muted"></i>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-muted">
          <i className="bi bi-prescription2" style={{ fontSize: '2rem' }}></i>
          <p className="mt-2">No prescriptions found.</p>
        </div>
      )}

      <button className="btn btn-outline-secondary" onClick={onSkip}>
        <i className="bi bi-skip-forward me-1"></i>Skip, I don't have a prescription
      </button>
    </div>
  );
}

function PharmacySelectionStep({ userId, geolocation, deliveryContact, prescriptionHeaderId, fulfillmentType, onSelect, onBack }) {
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const deliveryOnly = fulfillmentType === 'Delivery';
  const refLat = deliveryContact?.deliveryLatitude ?? geolocation?.lat ?? null;
  const refLng = deliveryContact?.deliveryLongitude ?? geolocation?.lng ?? null;

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    const params = {};
    if (deliveryOnly) params.deliveryOnly = true;
    if (prescriptionHeaderId) params.prescriptionHeaderId = prescriptionHeaderId;
    if (refLat && refLng) {
      params.lat = refLat;
      params.lng = refLng;
    }
    pharmacyApi.getRecommendations(params)
      .then((data) => {
        const safeData = Array.isArray(data) ? data : [];
        setPharmacies(prescriptionHeaderId ? safeData.filter((p) => p.stockStatus === 'FULL') : safeData);
      })
      .catch(() => toast.error('Unable to load pharmacies.'))
      .finally(() => setLoading(false));
  }, [userId, deliveryOnly, prescriptionHeaderId, refLat, refLng]);

  const filtered = pharmacies.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (p.name || '').toLowerCase().includes(q) || (p.address || '').toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="d-flex flex-wrap gap-3 mb-3 align-items-center">
        <button className="btn btn-sm btn-outline-secondary" onClick={onBack}>
          <i className="bi bi-arrow-left me-1"></i>Back
        </button>
        <div className="input-group" style={{ maxWidth: '320px' }}>
          <span className="input-group-text"><i className="bi bi-search"></i></span>
          <input type="text" className="form-control" placeholder="Search by name or address..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <span className="badge bg-info">{fulfillmentType === 'Delivery' ? 'Delivery' : 'Pickup'}</span>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-shop" style={{ fontSize: '3rem' }}></i>
          <p className="mt-2">
          {prescriptionHeaderId
            ? 'No pharmacies can fulfill this prescription at the selected location.'
            : 'No pharmacies found.'}
          </p>
        </div>
      ) : (
        <div className="row g-3">
          {filtered.map((p) => {
            return (
              <div className="col-md-6 col-lg-4" key={p.pharmacyId}>
                <div className="card h-100 shadow-sm">
                  <div className="card-body">
                    <div className="d-flex align-items-start gap-3 mb-2">
                      <div className="rounded-circle bg-light d-flex align-items-center justify-content-center"
                        style={{ width: 48, height: 48, minWidth: 48 }}>
                        <i className="bi bi-shop fs-4 text-success"></i>
                      </div>
                      <div className="min-width-0 flex-grow-1">
                        <h6 className="mb-1">{p.name}</h6>
                        <p className="small text-muted mb-0">{p.address}</p>
                        {p.distanceLabel && (
                          <span className="small text-primary">
                            <i className="bi bi-geo-alt me-1"></i>{p.distanceLabel}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="small text-muted mb-2">
                      {p.averageRating != null && (
                        <span className="me-3"><i className="bi bi-star-fill text-warning me-1"></i>{p.averageRating.toFixed(1)}</span>
                      )}
                      {fulfillmentType === 'Delivery' ? (
                        <>
                          {p.deliveryAvailable && (
                            <span className="me-3"><i className="bi bi-truck text-info me-1"></i>Delivery</span>
                          )}
                          {p.deliveryRadius != null && (
                            <span className="me-3"><i className="bi bi-geo-alt text-muted me-1"></i>{p.deliveryRadius}km radius</span>
                          )}
                        </>
                      ) : (
                        <>
                          {p.distanceLabel && (
                            <span className="me-3"><i className="bi bi-geo-alt text-primary me-1"></i>Distance: {p.distanceLabel}</span>
                          )}
                        </>
                      )}
                    </div>
                    <button className="btn btn-sm btn-outline-primary w-100" onClick={() => onSelect(p)}>
                      <i className="bi bi-send me-1"></i>Send Order
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FulfillmentStep({ profile, geolocation, geoTried, fulfillmentType, setFulfillmentType, pickupArea, setPickupArea, onBack, onContinue }) {
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [source, setSource] = useState('PROFILE');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const profileAddress = [profile?.address, profile?.city, profile?.country].filter(Boolean).join(', ');
    setAddress(profileAddress);
    setPhone(profile?.phoneNumber || '');
    setLatitude(profile?.latitude ?? null);
    setLongitude(profile?.longitude ?? null);
  }, [profile]);

  const useCurrentLocation = async () => {
    if (!geolocation) {
      toast.error(geoTried ? 'Can not access your device location.' : 'Still trying to access your location.');
      return;
    }
    setSaving(true);
    try {
      const result = await pharmacyApi.reverseGeocode({
        latitude: geolocation.lat,
        longitude: geolocation.lng,
      });
      if (fulfillmentType === 'Delivery') {
        setAddress(result.formattedAddress || '');
        setLatitude(result.latitude);
        setLongitude(result.longitude);
        setSource('DEVICE_LOCATION');
        toast.success('Delivery address updated from current location.');
      } else {
        setPickupArea({ address: result.formattedAddress || '', latitude: result.latitude, longitude: result.longitude, source: 'DEVICE_LOCATION' });
        toast.success('Pickup area updated from current location.');
      }
    } catch (error) {
      const msg = error.response?.data?.message || '';
      if (msg.includes('API key is not configured')) {
        toast.error('Google Maps service is not configured. Please contact support.');
      } else {
        toast.error(msg || 'Unable to resolve current location.');
      }
    } finally {
      setSaving(false);
    }
  };

  const geocodeManual = async () => {
    const input = fulfillmentType === 'Delivery' ? address.trim() : pickupArea.address.trim();
    if (!input) {
      toast.error(fulfillmentType === 'Delivery' ? 'Please enter a delivery address.' : 'Please enter a pickup area.');
      return;
    }
    setSaving(true);
    try {
      const result = await pharmacyApi.geocodeAddress(input);
      if (fulfillmentType === 'Delivery') {
        setAddress(result.formattedAddress || input);
        setLatitude(result.latitude);
        setLongitude(result.longitude);
        setSource('MANUAL');
        toast.success('Delivery address verified.');
      } else {
        setPickupArea({ address: result.formattedAddress || input, latitude: result.latitude, longitude: result.longitude, source: 'MANUAL' });
        toast.success('Pickup area verified.');
      }
    } catch (error) {
      const msg = error.response?.data?.message || '';
      if (msg.includes('API key is not configured')) {
        toast.error('Google Maps service is not configured. Please contact support.');
      } else {
        toast.error(msg || fulfillmentType === 'Delivery' ? 'Unable to verify this address.' : 'Unable to verify this area.');
      }
    } finally {
      setSaving(false);
    }
  };

  const submit = () => {
    if (!phone.trim()) {
      toast.error('Please enter a phone number.');
      return;
    }

    if (fulfillmentType === 'Delivery') {
      if (!address.trim()) {
        toast.error('Please enter a delivery address.');
        return;
      }
      if (latitude == null || longitude == null) {
        toast.error('Please verify your delivery address first.');
        return;
      }
      onContinue({
        fulfillmentType,
        deliveryAddress: address.trim(),
        deliveryLatitude: latitude,
        deliveryLongitude: longitude,
        deliveryPhoneNumber: phone.trim(),
        deliveryAddressSource: source,
      });
    } else {
      if (!pickupArea.address.trim()) {
        toast.error('Please enter a pickup area.');
        return;
      }
      if (pickupArea.latitude == null || pickupArea.longitude == null) {
        toast.error('Please verify your pickup area first.');
        return;
      }
      onContinue({
        fulfillmentType,
        deliveryAddress: null,
        deliveryLatitude: pickupArea.latitude,
        deliveryLongitude: pickupArea.longitude,
        deliveryPhoneNumber: phone.trim(),
        deliveryAddressSource: pickupArea.source,
        pickupAddress: pickupArea.address.trim(),
      });
    }
  };

  return (
    <div>
      <div className="d-flex align-items-center gap-2 mb-1">
        <h5 className="fw-semibold mb-0">Fulfillment method</h5>
      </div>
      <p className="text-muted small mb-3">Choose how you want to receive the order.</p>

      <div className="btn-group mb-3 w-100">
        <button className={`btn ${fulfillmentType === 'Delivery' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setFulfillmentType('Delivery')}>
          <i className="bi bi-truck me-1"></i>Delivery
        </button>
        <button className={`btn ${fulfillmentType === 'Pickup' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setFulfillmentType('Pickup')}>
          <i className="bi bi-shop me-1"></i>Pickup
        </button>
      </div>

      <label className="form-label small">Phone number</label>
      <input className="form-control mb-3" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Your phone number" />

      {fulfillmentType === 'Delivery' ? (
        <>
          <label className="form-label small">Delivery address</label>
          <textarea className="form-control mb-2" rows="3" value={address} onChange={(e) => {
            setAddress(e.target.value);
            setLatitude(null);
            setLongitude(null);
            setSource('MANUAL');
          }} />

          <div className="d-flex flex-wrap gap-2 mb-3">
            <button className="btn btn-outline-primary btn-sm" disabled={saving} onClick={useCurrentLocation} type="button">
              <i className="bi bi-crosshair me-1"></i>Use current location
            </button>
            <button className="btn btn-outline-secondary btn-sm" disabled={saving || !address.trim()} onClick={geocodeManual} type="button">
              <i className="bi bi-geo-alt me-1"></i>Verify address
            </button>
          </div>

          {latitude != null && longitude != null && (
            <p className="small text-success mb-3">
              <i className="bi bi-check-circle me-1"></i>Location verified: {latitude.toFixed(5)}, {longitude.toFixed(5)}
            </p>
          )}
        </>
      ) : (
        <>
          <label className="form-label small">Pickup area</label>
          <textarea className="form-control mb-2" rows="2" value={pickupArea.address} onChange={(e) => {
            setPickupArea(prev => ({ ...prev, address: e.target.value, latitude: null, longitude: null, source: 'MANUAL' }));
          }} placeholder="e.g., Near Central Park, Gate 2" />

          <div className="d-flex flex-wrap gap-2 mb-3">
            <button className="btn btn-outline-primary btn-sm" disabled={saving} onClick={useCurrentLocation} type="button">
              <i className="bi bi-crosshair me-1"></i>Use current location
            </button>
            <button className="btn btn-outline-secondary btn-sm" disabled={saving || !pickupArea.address.trim()} onClick={geocodeManual} type="button">
              <i className="bi bi-geo-alt me-1"></i>Verify area
            </button>
          </div>

          {pickupArea.latitude != null && pickupArea.longitude != null && (
            <p className="small text-success mb-3">
              <i className="bi bi-check-circle me-1"></i>Pickup area verified: {pickupArea.latitude.toFixed(5)}, {pickupArea.longitude.toFixed(5)}
            </p>
          )}
        </>
      )}

      <div className="d-flex gap-2">
        <button className="btn btn-outline-secondary" onClick={onBack} type="button">Back</button>
        <button className="btn btn-primary" disabled={saving} onClick={submit} type="button">
          {saving ? 'Checking...' : 'Continue'}
        </button>
      </div>
    </div>
  );
}

function ConnectStep({ request, pharmacy, geolocation, userId, onRequestUpdated, onBack }) {
  const { openChatWith } = useChat();
  const [polling, setPolling] = useState(null);
  const startTime = useRef(Date.now());

  useEffect(() => {
    if (!request || request.status !== 'PENDING') return;

    const poll = setInterval(async () => {
      try {
        const updated = await pharmacyApi.getConsultationRequestById(request.requestId);
        if (updated.status !== 'PENDING') {
          onRequestUpdated(updated);
          setPolling(null);
          clearInterval(poll);
        }
      } catch { }
    }, 5000);

    setPolling(poll);
    return () => { if (poll) clearInterval(poll); };
  }, [request?.requestId, request?.status, onRequestUpdated]);

  useEffect(() => {
    return () => { if (polling) clearInterval(polling); };
  }, [polling]);

  const [elapsed, setElapsed] = useState('00:00');
  useEffect(() => {
    if (request?.status !== 'PENDING') return;
    const timer = setInterval(() => {
      const diff = Math.floor((Date.now() - startTime.current) / 1000);
      const m = String(Math.floor(diff / 60)).padStart(2, '0');
      const s = String(diff % 60).padStart(2, '0');
      setElapsed(`${m}:${s}`);
    }, 1000);
    return () => clearInterval(timer);
  }, [request?.status]);

  if (!request) return null;

  const isPending = request.status === 'PENDING';
  const isConnected = request.status === 'IN_REVIEW';
  const isOrderCreated = request.status === 'ORDER_CREATED';
  const isCancelled = request.status === 'CANCELLED';

  const handleRefreshOrder = async () => {
    try {
      const updated = await pharmacyApi.getConsultationRequestById(request.requestId);
      onRequestUpdated(updated);
    } catch { }
  };

  return (
    <div className="text-center py-4">
      {/* Pharmacy card */}
      <div className="card shadow-sm mx-auto mb-4" style={{ maxWidth: 400 }}>
        <div className="card-body">
          <div className="rounded-circle bg-light d-flex align-items-center justify-content-center mx-auto mb-2"
            style={{ width: 64, height: 64 }}>
            <i className="bi bi-shop fs-2 text-success"></i>
          </div>
          <h5 className="fw-semibold mb-1">{pharmacy?.name || 'Pharmacy'}</h5>
          <p className="small text-muted mb-0">{pharmacy?.address}</p>
          {pharmacy?.distanceLabel && (
            <span className="small text-primary"><i className="bi bi-geo-alt me-1"></i>{pharmacy.distanceLabel}</span>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="d-flex justify-content-center gap-4 mb-4">
        <div className="text-center">
          <div className={`rounded-circle d-flex align-items-center justify-content-center mx-auto mb-1 ${isPending || isConnected || isOrderCreated ? 'bg-success text-white' : 'bg-light text-muted'}`}
            style={{ width: 36, height: 36 }}>
            <i className="bi bi-check-lg"></i>
          </div>
          <small className="text-muted">Request sent</small>
        </div>
        <div className="align-self-center border-top flex-grow-1" style={{ maxWidth: 60 }} />
        <div className="text-center">
          <div className={`rounded-circle d-flex align-items-center justify-content-center mx-auto mb-1 ${isPending ? 'bg-warning pulse-animation' : isConnected || isOrderCreated ? 'bg-success text-white' : 'bg-light text-muted'}`}
            style={{ width: 36, height: 36 }}>
            {isPending ? <span className="spinner-grow spinner-grow-sm"></span> : <i className="bi bi-check-lg"></i>}
          </div>
          <small className="text-muted">Waiting</small>
        </div>
        <div className="align-self-center border-top flex-grow-1" style={{ maxWidth: 60 }} />
        <div className="text-center">
          <div className={`rounded-circle d-flex align-items-center justify-content-center mx-auto mb-1 ${isConnected || isOrderCreated ? 'bg-success text-white' : 'bg-light text-muted'}`}
            style={{ width: 36, height: 36 }}>
            <i className="bi bi-plug"></i>
          </div>
          <small className="text-muted">Connected</small>
        </div>
      </div>

      {isPending && (
        <>
          <div className="mb-3">
            <div className="spinner-border text-primary mb-2" role="status" />
            <p className="fw-medium mb-1">Waiting for pharmacy to accept...</p>
            <p className="small text-muted">Elapsed: {elapsed}</p>
          </div>
          <button className="btn btn-sm btn-outline-secondary" onClick={() => {
            pharmacyApi.getConsultationRequestById(request.requestId).then(onRequestUpdated).catch(() => { });
          }}>
            <i className="bi bi-arrow-clockwise me-1"></i>Refresh
          </button>
        </>
      )}

      {isConnected && (
        <div>
          <div className="alert alert-success mb-3">
            <i className="bi bi-check-circle-fill me-2"></i>
            Pharmacy has accepted your request! You are now connected.
          </div>
          <div className="d-flex justify-content-center gap-2">
            <button className="btn btn-primary" onClick={() => {
              if (openChatWith) openChatWith({ uid: request.patientId, displayName: request.patientName ? request.patientName : `Patient #${request.patientId}` });
            }}>
              <i className="bi bi-chat-dots-fill me-1"></i>Chat
            </button>
            <button className="btn btn-outline-primary" onClick={handleRefreshOrder}>
              <i className="bi bi-arrow-clockwise me-1"></i>Check for order
            </button>
          </div>
        </div>
      )}

      {isOrderCreated && request.pharmacyOrderId && (
        <div>
          <div className="alert alert-info mb-3">
            <i className="bi bi-file-text me-2"></i>
            Pharmacy has created an order for you!
          </div>
          <Link className="btn btn-primary" to={`/patient-dashboard/pharmacy/orders/${request.pharmacyOrderId}`}>
            <i className="bi bi-eye me-1"></i>View Order & Confirm
          </Link>
        </div>
      )}

      {isCancelled && (
        <div className="alert alert-danger">
          <i className="bi bi-x-circle-fill me-2"></i>
          Request was cancelled.
        </div>
      )}

      {isPending && (
        <button className="btn btn-sm btn-outline-danger mt-3" onClick={onBack}>
          <i className="bi bi-arrow-left me-1"></i>Back to pharmacy list
        </button>
      )}
    </div>
  );
}

function RequestsView({ userId }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    pharmacyApi.getConsultationRequestsByPatient(userId)
      .then((data) => setRequests(Array.isArray(data) ? data : []))
      .catch(() => toast.error('Unable to load requests.'))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-5 text-muted">
        <i className="bi bi-chat-square-text" style={{ fontSize: '3rem' }}></i>
        <p className="mt-2">No consultation requests yet.</p>
      </div>
    );
  }

  return (
    <div className="list-group">
      {requests.map((req) => (
        <div key={req.requestId} className="list-group-item list-group-item-action">
          <div className="d-flex w-100 justify-content-between">
            <h6 className="mb-1">{req.pharmacyName || 'Pharmacy'}</h6>
            <small className="text-muted">{new Date(req.createdAt).toLocaleDateString()}</small>
          </div>
          <p className="mb-1 small">{req.symptoms || req.description || 'No description'}</p>
          <div className="d-flex gap-2 align-items-center">
            <span className="badge bg-info">{req.requestType === 'ORDER_REQUEST' ? 'Order Request' : 'Consultation'}</span>
            <span className={`badge ${req.status === 'CANCELLED' ? 'bg-danger' : req.status === 'ORDER_CREATED' ? 'bg-success' : req.status === 'IN_REVIEW' ? 'bg-info' : 'bg-secondary'}`}>
              {req.status}
            </span>
            {req.pharmacyOrderId && (
              <Link to={`/patient-dashboard/pharmacy/orders/${req.pharmacyOrderId}`} className="small">
                <i className="bi bi-box-seam me-1"></i>View Order
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function OrdersView({ userId, navigate }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    pharmacyApi.getOrdersByPatient(userId)
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch(() => toast.error('Unable to load orders.'))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-5 text-muted">
        <i className="bi bi-box-seam" style={{ fontSize: '3rem' }}></i>
        <p className="mt-2">No pharmacy orders yet.</p>
      </div>
    );
  }

  const statusBadge = (s) => {
    const map = { PENDING: 'warning', CONFIRMED: 'info', PREPARING: 'primary', READY: 'primary', SHIPPING: 'info', DELIVERED: 'success', COMPLETED: 'success', CANCELLED: 'danger', REFUNDED: 'secondary' };
    return `bg-${map[s] || 'secondary'}`;
  };

  return (
    <div className="list-group">
      {orders.map((o) => (
        <div key={o.orderId} className="list-group-item list-group-item-action"
          onClick={() => navigate(`/patient-dashboard/pharmacy/orders/${o.orderId}`)}
          style={{ cursor: 'pointer' }}>
          <div className="d-flex w-100 justify-content-between align-items-start">
            <div>
              <h6 className="mb-1">{o.orderNumber || `Order #${o.orderId}`}</h6>
              <p className="mb-1 small text-muted">{o.pharmacyName || 'Pharmacy'}</p>
            </div>
            <div className="text-end">
              <span className={`badge ${statusBadge(o.status)} me-1`}>{titleCase(o.status)}</span>
              {shouldShowPaymentBadge(o) && (
                <span className={`badge ${paymentBadgeClass(o.paymentStatus)}`}>{o.paymentStatus}</span>
              )}
            </div>
          </div>
          {o.totalAmount != null && (
            <small className="fw-bold">${Number(o.totalAmount).toFixed(2)}</small>
          )}
        </div>
      ))}
    </div>
  );
}

function PharmacyPayPalButton({ order, onPaid, onCancel, onError, onFail }) {
  const buttonRef = useRef(null);
  const orderCreationErrorRef = useRef(false);
  const [loadingSdk, setLoadingSdk] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!order?.orderId || !buttonRef.current || order.paymentStatus === 'PAID') return;

    const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
    if (!clientId) {
      toast.error('PayPal client id is missing. Please set VITE_PAYPAL_CLIENT_ID.');
      return;
    }

    let cancelled = false;
    buttonRef.current.innerHTML = '';
    setLoadingSdk(true);

    loadPayPalSdk(clientId, 'USD')
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
              const createRes = await paymentApi.createPharmacyOrderPayPalOrder(order.orderId);
              const paypalOrderId = createRes?.orderId || createRes?.id;
              if (!paypalOrderId) {
                throw new Error('Unexpected pharmacy PayPal create response');
              }
              return paypalOrderId;
            } catch (error) {
              orderCreationErrorRef.current = true;
              toast.error(error.response?.data?.message || 'Can not create PayPal payment order.');
              onFail?.();
              throw error;
            }
          },
          onApprove: async (data) => {
            setProcessing(true);
            try {
              const updatedOrder = await paymentApi.capturePharmacyOrderPayPalPayment(
                order.orderId,
                data.orderID,
                'EWallet'
              );
              toast.success('Payment successful!', {
                id: getWorkflowToastId({ type: 'INVOICE_PAID', relatedId: order.orderId }),
              });
              onPaid(updatedOrder);
            } catch (error) {
              toast.error(error.response?.data?.message || 'Payment could not be captured.');
              onFail?.();
            } finally {
              setProcessing(false);
            }
          },
          onCancel: () => {
            toast.warning('Payment was cancelled.');
            onCancel?.();
          },
          onError: (error) => {
            console.error('PayPal pharmacy error', error);
            if (orderCreationErrorRef.current) {
              orderCreationErrorRef.current = false;
              return;
            }
            toast.error('PayPal could not process this payment.');
            onError?.();
          },
        }).render(buttonRef.current);
      })
      .catch((error) => {
        console.error('Could not load PayPal SDK', error);
        toast.error('Could not load PayPal checkout.');
      })
      .finally(() => {
        if (!cancelled) setLoadingSdk(false);
      });

    return () => {
      cancelled = true;
      if (buttonRef.current) {
        buttonRef.current.innerHTML = '';
      }
    };
  }, [order?.orderId, order?.paymentStatus, onPaid, onCancel, onError, onFail]);

  if (order.paymentStatus === 'PAID') {
    return (
      <div className="alert alert-success mb-0 text-center">
        <i className="bi bi-check-circle-fill me-2"></i>Payment completed
      </div>
    );
  }

  return (
    <div>
      {loadingSdk && <div className="text-center small text-muted mb-2"><div className="spinner-border spinner-border-sm me-1" role="status" />Loading PayPal...</div>}
      {processing && <div className="text-center small text-muted mb-2"><div className="spinner-border spinner-border-sm me-1" role="status" />Processing payment...</div>}
      <div ref={buttonRef} />
    </div>
  );
}

function OrderDetailView({ orderId, navigate }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [confirmedForPayment, setConfirmedForPayment] = useState(false);
  const [revisionReason, setRevisionReason] = useState('');
  const [requestingRevision, setRequestingRevision] = useState(false);
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [showDeliveryContactEditor, setShowDeliveryContactEditor] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [newDeliveryAddress, setNewDeliveryAddress] = useState('');
  const [newDeliveryPhone, setNewDeliveryPhone] = useState('');
  const [deliveryContactReason, setDeliveryContactReason] = useState('');
  const [savingDeliveryContact, setSavingDeliveryContact] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const data = await pharmacyApi.getOrderById(orderId);
      setOrder(data);
      setConfirmedForPayment(false);
    } catch {
      toast.error('Unable to load order.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  useEffect(() => {
    const handleOffline = () => setConfirmedForPayment(false);
    window.addEventListener('offline', handleOffline);
    return () => window.removeEventListener('offline', handleOffline);
  }, []);

  const handleCancelClick = () => {
    setShowCancelConfirm(true);
  };

  const handleCloseCancelConfirm = () => {
    if (!cancelling) {
      setShowCancelConfirm(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!order?.orderId) return;
    const cancelToastId = getWorkflowToastId({ type: 'CANCEL_ORDER', relatedId: order.orderId });
    suppressWorkflowToast(cancelToastId);
    setCancelling(true);
    try {
      const updatedOrder = await pharmacyApi.cancelOrder(order.orderId, {
        cancelReason: 'Patient requested cancellation',
      });
      setOrder(updatedOrder);
      setConfirmedForPayment(false);
      setShowCancelConfirm(false);
      toast.success('Order cancelled.', {
        id: `patient-order-cancel:${order.orderId}`,
      });
    } catch (err) {
      clearWorkflowToastSuppression(cancelToastId);
      toast.error(err.response?.data?.message || 'Unable to cancel order.');
    } finally {
      setCancelling(false);
    }
  };

  const handleConfirmOrder = () => {
    setConfirmedForPayment(true);
    toast.success('Order confirmed! You can now proceed to payment.');
  };

  const handlePatientConfirmTotal = async () => {
    try {
      const updatedOrder = await pharmacyApi.confirmOrderTotalByPatient(order.orderId);
      setOrder(updatedOrder);
      setConfirmedForPayment(true);
      toast.success('Total confirmed! You can now proceed to payment.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to confirm total.');
    }
  };

  const handleRequestRevision = async () => {
    if (!revisionReason.trim()) {
      toast.error('Please provide a reason for the change request.');
      return;
    }
    setRequestingRevision(true);
    try {
      await pharmacyApi.requestOrderRevision(order.orderId, { reason: revisionReason });
      toast.success('Change request sent. Waiting for pharmacy update.');
      setShowRevisionForm(false);
      setRevisionReason('');
      await loadOrder();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to request changes.');
    } finally {
      setRequestingRevision(false);
    }
  };

  const handleSaveDeliveryContact = async () => {
    if (!newDeliveryAddress.trim() || !newDeliveryPhone.trim()) {
      toast.error('Please fill in address and phone number.');
      return;
    }
    const addressChanged = newDeliveryAddress.trim() !== (order.deliveryAddress || '');
    if (addressChanged) {
      if (!deliveryContactReason.trim()) {
        toast.error('Please provide a reason for the address change.');
        return;
      }
      setSavingDeliveryContact(true);
      try {
        const payload = {
          deliveryAddress: newDeliveryAddress.trim(),
          deliveryPhoneNumber: newDeliveryPhone.trim(),
          reason: deliveryContactReason.trim(),
        };
        const updated = await pharmacyApi.requestDeliveryContactChange(orderId, payload);
        setOrder(updated);
        setShowDeliveryContactEditor(false);
        setNewDeliveryAddress('');
        setNewDeliveryPhone('');
        setDeliveryContactReason('');
        toast.success('Delivery address change request sent for pharmacy review.');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Unable to request delivery contact change.');
      } finally {
        setSavingDeliveryContact(false);
      }
    } else {
      setSavingDeliveryContact(true);
      try {
        const updated = await pharmacyApi.updateOrderDeliveryContact(orderId, {
          deliveryAddress: order.deliveryAddress || '',
          deliveryPhoneNumber: newDeliveryPhone.trim(),
        });
        setOrder(updated);
        setShowDeliveryContactEditor(false);
        setNewDeliveryAddress('');
        setNewDeliveryPhone('');
        toast.success('Phone number updated.');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Unable to update phone number.');
      } finally {
        setSavingDeliveryContact(false);
      }
    }
  };

  const handlePaid = useCallback(async (updatedOrder) => {
    if (updatedOrder?.paymentStatus === 'PAID') {
      setOrder(updatedOrder);
      setConfirmedForPayment(false);
      return;
    }
    try {
      const data = await pharmacyApi.getOrderById(orderId);
      setOrder(data);
    } catch {
      toast.error('Failed to refresh order after payment');
    }
  }, [orderId]);

  const handlePayPalCancel = useCallback(() => {
    setConfirmedForPayment(false);
  }, []);

  const handlePayPalError = useCallback(() => {
    setConfirmedForPayment(false);
  }, []);

  const handlePayPalFail = useCallback(() => {
    setConfirmedForPayment(false);
  }, []);

  const handleDownloadPdf = async () => {
    if (!order.invoiceId) {
      toast.error('No invoice available yet.');
      return;
    }
    try {
      const { default: axiosInstance } = await import('../../api/axiosConfig');
      const response = await axiosInstance.get(`/api/payment/invoices/${order.invoiceId}/pdf`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${order.invoiceId}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download invoice PDF.');
    }
  };

  const statusBadge = (s) => {
    const map = { PENDING: 'warning', CONFIRMED: 'info', PREPARING: 'primary', READY: 'primary', SHIPPING: 'info', DELIVERED: 'success', COMPLETED: 'success', CANCELLED: 'danger', REFUNDED: 'secondary', REVISION_REQUESTED: 'warning' };
    return map[s] || 'secondary';
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-5 text-muted">
        <i className="bi bi-box-seam" style={{ fontSize: '3rem' }}></i>
        <p className="mt-2">Order not found.</p>
        <button className="btn btn-outline-primary" onClick={() => navigate('/patient-dashboard/pharmacy/orders')}>Back to Orders</button>
      </div>
    );
  }

  const status = order.status;
  const isRevisionRequested = status === 'REVISION_REQUESTED';
  const isPaid = order.paymentStatus === 'PAID';
  const isTerminal = ['CANCELLED', 'REFUNDED', 'SHIPPING', 'DELIVERED', 'COMPLETED'].includes(status);
  const isRetailOrder = !order.prescriptionHeaderId && !order.pharmacyRequestId;
  const retailAwaitingConfirmation = isRetailOrder && status === 'PENDING' && !isPaid;
  const pendingPatientConfirmation = Boolean(order.requiresPatientConfirmation);
  const needsPayment = !isPaid
    && !isTerminal
    && !isRevisionRequested
    && !retailAwaitingConfirmation
    && !pendingPatientConfirmation;
  const canCancel = ['PENDING', 'CONFIRMED'].includes(status) && !isPaid;
  const canRequestRevision = needsPayment && !isRevisionRequested;
  const showPaymentAction = needsPayment;
  const showContinueToPayment = showPaymentAction && !confirmedForPayment;
  const showStandaloneCancel = canCancel
    && !pendingPatientConfirmation
    && !showPaymentAction
    && !showRevisionForm
    && !showDeliveryContactEditor;

  return (
    <div>
      <div className="d-flex align-items-center gap-3 mb-4">
        <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate('/patient-dashboard/pharmacy/orders')}>
          <i className="bi bi-arrow-left"></i>
        </button>
        <h4 className="mb-0">Order {order.orderNumber || `#${orderId}`}</h4>
        <span className={`badge bg-${statusBadge(order.status)}`}>{titleCase(order.status)}</span>
        {shouldShowPaymentBadge(order) && (
          <span className={`badge ${paymentBadgeClass(order.paymentStatus)}`}>{order.paymentStatus}</span>
        )}
        {order.invoiceId && (
          <button className="btn btn-sm btn-outline-primary" onClick={handleDownloadPdf}>
            <i className="bi bi-file-pdf me-1"></i>PDF
          </button>
        )}
      </div>

      {isRevisionRequested && (
        <div className="alert alert-warning mb-3">
          <i className="bi bi-pencil-square me-2"></i>
          Change request sent. Waiting for pharmacy to update the order.
        </div>
      )}

      {retailAwaitingConfirmation && (
        <div className="alert alert-info mb-3">
          <i className="bi bi-hourglass-split me-2"></i>
          Waiting for the pharmacy to confirm stock and pricing before payment.
        </div>
      )}

      {pendingPatientConfirmation && (
        <div className="alert alert-warning mb-3">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {order.patientConfirmationReason === 'DELIVERY_QUOTE'
            ? 'The pharmacy has sent the delivery fee. Please confirm the total before payment.'
            : order.patientConfirmationReason === 'DELIVERY_CONTACT_FEE_CHANGE'
            ? 'Your delivery change affects the total. Please confirm the updated total.'
            : 'Please confirm the order total before payment.'}
        </div>
      )}

      <div className="row g-4">
        <div className="col-md-8">
          <div className="card shadow-sm mb-3">
            <div className="card-body">
              <h6 className="card-title fw-semibold mb-3">Order Details</h6>
              <table className="table table-sm">
                <tbody>
                  <tr><td className="text-muted">Pharmacy</td><td className="fw-medium">{order.pharmacyName || 'N/A'}</td></tr>
                  <tr><td className="text-muted">Total Amount</td><td className="fw-bold">${Number(order.totalAmount || 0).toFixed(2)}</td></tr>
                  <tr><td className="text-muted">Delivery Type</td><td>{order.deliveryType || 'N/A'}</td></tr>
                  {order.deliveryAddress && <tr><td className="text-muted">Delivery Address</td><td>{order.deliveryAddress}</td></tr>}
                  {order.deliveryFee != null && <tr><td className="text-muted">Delivery Fee</td><td>${Number(order.deliveryFee).toFixed(2)}</td></tr>}
                  {order.estimatedDeliveryTime && <tr><td className="text-muted">Estimated Delivery</td><td>{new Date(order.estimatedDeliveryTime).toLocaleString()}</td></tr>}
                  <tr><td className="text-muted">Created</td><td>{order.createdAt ? new Date(order.createdAt).toLocaleString() : 'N/A'}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {order.items && order.items.length > 0 && (
            <div className="card shadow-sm">
              <div className="card-body">
                <h6 className="card-title fw-semibold mb-3">Items</h6>
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Medication</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item, i) => (
                        <tr key={i}>
                          <td>{item.medicationName || item.name}</td>
                          <td>{item.quantity}</td>
                          <td>${Number((item.totalPrice || 0) / (item.quantity || 1)).toFixed(2)}</td>
                          <td>${Number(item.totalPrice || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="border-top pt-2 mt-2">
                  <div className="d-flex justify-content-between small"><span>Medicine Amount</span><strong>${Number(order.medicineAmount || 0).toFixed(2)}</strong></div>
                  <div className="d-flex justify-content-between small"><span>Delivery Fee</span><strong>${Number(order.deliveryFee || 0).toFixed(2)}</strong></div>
                  <div className="d-flex justify-content-between fw-bold mt-1"><span>Total</span><span>${Number(order.totalAmount || 0).toFixed(2)}</span></div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="col-md-4">
          {pendingPatientConfirmation && !isPaid && (
            <div className="card shadow-sm mb-3 border-primary">
              <div className="card-body">
                <h6 className="fw-semibold mb-3 text-primary">Confirm Total</h6>
                <div className="border rounded p-2 mb-3 bg-light">
                  <div className="d-flex justify-content-between small"><span>Medicine Amount</span><strong>${Number(order.medicineAmount || 0).toFixed(2)}</strong></div>
                  <div className="d-flex justify-content-between small"><span>Delivery Fee</span><strong>${Number(order.deliveryFee || 0).toFixed(2)}</strong></div>
                  <div className="d-flex justify-content-between fw-bold mt-1"><span>Total</span><span>${Number(order.totalAmount || 0).toFixed(2)}</span></div>
                </div>
                <button className="btn btn-primary w-100 mb-2" onClick={handlePatientConfirmTotal}>
                  <i className="bi bi-check-circle me-2"></i>Confirm Total
                </button>
                {canCancel && (
                  <button className="btn btn-outline-danger w-100" disabled={cancelling} onClick={handleCancelClick}>
                    {cancelling ? 'Cancelling...' : 'Cancel Order'}
                  </button>
                )}
              </div>
            </div>
          )}

          {showPaymentAction && (
            <div className="card shadow-sm mb-3">
              <div className="card-body text-center">
                <h6 className="fw-semibold mb-3">Payment</h6>
                {showContinueToPayment ? (
                  <>
                    <p className="small text-muted mb-3">Review the order details before opening payment.</p>
                    <button className="btn btn-primary w-100 mb-2" onClick={handleConfirmOrder}>
                      <i className="bi bi-credit-card me-2"></i>Continue to Payment
                    </button>
                  </>
                ) : (
                  <>
                    <p className="small text-muted mb-3">Pay with PayPal to complete your order.</p>
                    <PharmacyPayPalButton
                      order={order}
                      onPaid={handlePaid}
                      onCancel={handlePayPalCancel}
                      onError={handlePayPalError}
                      onFail={handlePayPalFail}
                    />
                  </>
                )}
                {canCancel && (
                  <button className="btn btn-outline-danger w-100 mt-2" disabled={cancelling} onClick={handleCancelClick}>
                    {cancelling ? 'Cancelling...' : 'Cancel Order'}
                  </button>
                )}
              </div>
            </div>
          )}

          {isPrescriptionBasedOrder(order) && order.deliveryType !== 'Pickup' && order.deliveryContactChangeStatus === 'PENDING' && (
            <div className="card shadow-sm mb-3">
              <div className="card-body text-center">
                <i className="bi bi-clock-history text-warning fs-4 mb-2 d-block"></i>
                <p className="small mb-0">Pharmacy is reviewing the address and delivery fee.</p>
              </div>
            </div>
          )}

          {isPrescriptionBasedOrder(order) && order.deliveryType !== 'Pickup' && (
            <>
              {order.deliveryContactChangeStatus !== 'PENDING' && ['SHIPPING', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED'].includes(order.status) && (
                <div className="card shadow-sm mb-3">
                  <div className="card-body text-center">
                    <i className="bi bi-lock text-muted fs-4 mb-2 d-block"></i>
                    <p className="small text-muted mb-0">Delivery contact is locked for this order status.</p>
                  </div>
                </div>
              )}

              {order.deliveryContactChangeStatus !== 'PENDING' && ['PENDING', 'CONFIRMED', 'PREPARING'].includes(order.status) && !showDeliveryContactEditor && (
                <div className="card shadow-sm mb-3">
                  <div className="card-body text-center">
                    <h6 className="fw-semibold mb-3">Delivery Contact</h6>
                    <p className="small text-muted mb-3">{order.deliveryAddress}{order.deliveryPhoneNumber ? ` — ${order.deliveryPhoneNumber}` : ''}</p>
                    <button className="btn btn-outline-primary w-100" onClick={() => {
                      setNewDeliveryAddress(order.deliveryAddress || '');
                      setNewDeliveryPhone(order.deliveryPhoneNumber || '');
                      setShowDeliveryContactEditor(true);
                    }}>
                      <i className="bi bi-pencil me-2"></i>Edit Delivery Contact
                    </button>
                  </div>
                </div>
              )}

              {order.deliveryContactChangeStatus !== 'PENDING' && ['PENDING', 'CONFIRMED', 'PREPARING'].includes(order.status) && showDeliveryContactEditor && (
                <div className="card shadow-sm mb-3 border-primary">
                  <div className="card-body">
                    <h6 className="fw-semibold mb-3">Edit Delivery Contact</h6>
                    <div className="mb-2">
                      <label className="form-label small">Current: {order.deliveryAddress}{order.deliveryPhoneNumber ? ` — ${order.deliveryPhoneNumber}` : ''}</label>
                    </div>
                    <div className="mb-2">
                      <label className="form-label small">New Address</label>
                      <input className="form-control form-control-sm" value={newDeliveryAddress} onChange={(e) => setNewDeliveryAddress(e.target.value)} />
                    </div>
                    <div className="mb-2">
                      <label className="form-label small">New Phone</label>
                      <input className="form-control form-control-sm" value={newDeliveryPhone} onChange={(e) => setNewDeliveryPhone(e.target.value)} />
                    </div>
                    <div className="mb-2">
                      <label className="form-label small">Reason for change</label>
                      <textarea className="form-control form-control-sm" rows="2" value={deliveryContactReason}
                        onChange={(e) => setDeliveryContactReason(e.target.value)} placeholder="Required if address changes" />
                    </div>
                    <div className="d-flex gap-2 mt-3">
                      <button className="btn btn-primary btn-sm flex-grow-1" disabled={savingDeliveryContact} onClick={handleSaveDeliveryContact}>
                        {savingDeliveryContact ? 'Saving...' : 'Save'}
                      </button>
                      <button className="btn btn-outline-secondary btn-sm" onClick={() => { setShowDeliveryContactEditor(false); setNewDeliveryAddress(''); setNewDeliveryPhone(''); setDeliveryContactReason(''); }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {order.deliveryContactChangeStatus !== 'PENDING' && order.status === 'READY' && !showDeliveryContactEditor && (
                <div className="card shadow-sm mb-3">
                  <div className="card-body text-center">
                    <h6 className="fw-semibold mb-3">Delivery Contact</h6>
                    <p className="small text-muted mb-3">{order.deliveryAddress}{order.deliveryPhoneNumber ? ` — ${order.deliveryPhoneNumber}` : ''}</p>
                    <button className="btn btn-outline-warning w-100" onClick={() => {
                      setNewDeliveryAddress(order.deliveryAddress || '');
                      setNewDeliveryPhone(order.deliveryPhoneNumber || '');
                      setShowDeliveryContactEditor(true);
                    }}>
                      <i className="bi bi-pencil me-2"></i>Request Delivery Contact Change
                    </button>
                  </div>
                </div>
              )}

              {order.deliveryContactChangeStatus !== 'PENDING' && order.status === 'READY' && showDeliveryContactEditor && (
                <div className="card shadow-sm mb-3 border-warning">
                  <div className="card-body">
                    <h6 className="fw-semibold mb-3">Request Delivery Contact Change</h6>
                    <div className="mb-2">
                      <label className="form-label small">Current: {order.deliveryAddress}{order.deliveryPhoneNumber ? ` — ${order.deliveryPhoneNumber}` : ''}</label>
                    </div>
                    <div className="mb-2">
                      <label className="form-label small">New Address</label>
                      <input className="form-control form-control-sm" value={newDeliveryAddress} onChange={(e) => setNewDeliveryAddress(e.target.value)} />
                    </div>
                    <div className="mb-2">
                      <label className="form-label small">New Phone</label>
                      <input className="form-control form-control-sm" value={newDeliveryPhone} onChange={(e) => setNewDeliveryPhone(e.target.value)} />
                    </div>
                    <div className="mb-2">
                      <label className="form-label small">Reason for change</label>
                      <textarea className="form-control form-control-sm" rows="2" value={deliveryContactReason} onChange={(e) => setDeliveryContactReason(e.target.value)} />
                    </div>
                    <div className="d-flex gap-2 mt-3">
                      <button className="btn btn-warning btn-sm flex-grow-1" disabled={savingDeliveryContact} onClick={handleSaveDeliveryContact}>
                        {savingDeliveryContact ? 'Sending...' : 'Send Request'}
                      </button>
                      <button className="btn btn-outline-secondary btn-sm" onClick={() => { setShowDeliveryContactEditor(false); setNewDeliveryAddress(''); setNewDeliveryPhone(''); setDeliveryContactReason(''); }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {!isPrescriptionBasedOrder(order) && canRequestRevision && !showRevisionForm && (
            <div className="card shadow-sm mb-3">
              <div className="card-body text-center">
                <h6 className="fw-semibold mb-3">Request Changes</h6>
                <p className="small text-muted mb-3">Need to modify medications, prices, or delivery?</p>
                <button className="btn btn-outline-warning w-100" onClick={() => setShowRevisionForm(true)}>
                  <i className="bi bi-pencil me-2"></i>Request Changes
                </button>
              </div>
            </div>
          )}

          {!isPrescriptionBasedOrder(order) && canRequestRevision && showRevisionForm && (
            <div className="card shadow-sm mb-3 border-warning">
              <div className="card-body">
                <h6 className="fw-semibold mb-3">Request Changes</h6>
                <div className="mb-3">
                  <label className="form-label small">Describe the changes you need:</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="e.g., Please remove Vitamin C and update delivery time."
                    value={revisionReason}
                    onChange={(e) => setRevisionReason(e.target.value)}
                  />
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-warning flex-grow-1" disabled={requestingRevision} onClick={handleRequestRevision}>
                    {requestingRevision ? 'Sending...' : 'Send Request'}
                  </button>
                  <button className="btn btn-outline-secondary" onClick={() => { setShowRevisionForm(false); setRevisionReason(''); }}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {showStandaloneCancel && (
            <div className="card shadow-sm">
              <div className="card-body text-center">
                <h6 className="fw-semibold mb-3 text-danger">Cancel Order</h6>
                <p className="small text-muted mb-3">Cancel this order if you no longer need it.</p>
                <button className="btn btn-outline-danger w-100" disabled={cancelling} onClick={handleCancelClick}>
                  {cancelling ? 'Cancelling...' : 'Cancel Order'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <ConfirmModal
        isOpen={showCancelConfirm}
        onClose={handleCloseCancelConfirm}
        onConfirm={handleConfirmCancel}
        title="Cancel Order"
        message="Are you sure you want to cancel this order? This action cannot be undone."
        confirmText="Yes, Cancel"
        cancelText="Keep Order"
        iconClass="bi-exclamation-triangle-fill"
        variant="danger"
      />
    </div>
  );
}
