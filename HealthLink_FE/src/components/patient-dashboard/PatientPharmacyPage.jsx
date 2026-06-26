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
import RetailPharmacyStore from './pharmacy-store/RetailPharmacyStore';
import './PatientPharmacy.css';

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
    return <OrderDetailView orderId={orderId} userId={userId} navigate={navigate} />;
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
        <PharmacyWizard userId={userId} navigate={navigate} />
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
  const [step, setStep] = useState(autoSelectId ? 'delivery' : 'prescription');
  const [prescriptionHeaderId, setPrescriptionHeaderId] = useState(autoSelectId || null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);
  const [request, setRequest] = useState(null);
  const [geolocation, setGeolocation] = useState(null);
  const [geoTried, setGeoTried] = useState(false);
  const [patientProfile, setPatientProfile] = useState(null);
  const [deliveryContact, setDeliveryContact] = useState(null);
  const steps = ['prescription', 'delivery', 'pharmacy', 'submitted'];
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
    setPrescriptionHeaderId(id);
    setStep('delivery');
  };

  const handleSkipPrescription = () => {
    setPrescriptionHeaderId(null);
    setStep('delivery');
  };

  const handleSelectPharmacy = async (pharmacy) => {
    setSelectedPharmacy(pharmacy);

    try {
      const payload = {
        patientId: userId,
        pharmacyId: pharmacy.pharmacyId,
        requestType: flowType,
        symptoms: flowType === 'CONSULTATION' ? '' : undefined,
        description: prescriptionHeaderId 
          ? 'Patient requested an order from an existing prescription' 
          : 'Patient requested an OTC order',
        allergies: '',
        additionalNotes: '',
        preferredDeliveryType: 'Delivery',
        deliveryType: 'Delivery',
        deliveryAddress: deliveryContact?.deliveryAddress,
        deliveryLatitude: deliveryContact?.deliveryLatitude,
        deliveryLongitude: deliveryContact?.deliveryLongitude,
        deliveryPhoneNumber: deliveryContact?.deliveryPhoneNumber,
        deliveryAddressSource: deliveryContact?.deliveryAddressSource,
        prescriptionHeaderIds: prescriptionHeaderId ? [prescriptionHeaderId] : undefined,
      };
      const created = await pharmacyApi.createConsultationRequest(payload);

      if (flowType === 'ORDER_REQUEST') {
        toast.success('Order request sent to pharmacy.');
        navigate('/patient-dashboard/pharmacy/requests');
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
              {s === 'mode' ? 'Mode' : s === 'prescription' ? 'Prescription' : s === 'delivery' ? 'Delivery' : s === 'pharmacy' ? 'Pharmacy' : s === 'connect' ? 'Connect' : s === 'submitted' ? 'Submitted' : 'Payment'}
            </small>
            {i < steps.length - 1 && <div className="border-top mx-1" style={{ width: 20 }} />}
          </div>
        ))}
      </div>

      {step === 'mode' && (
        <RequestModeStep onChoose={(type) => { setFlowType(type); setStep('prescription'); }} />
      )}

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

      {step === 'delivery' && (
        <DeliveryContactStep
          profile={patientProfile}
          geolocation={geolocation}
          geoTried={geoTried}
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

function RequestModeStep({ onChoose }) {
  return (
    <div className="pharmacy-mode-grid">
      <button className="pharmacy-mode-card" onClick={() => onChoose('CONSULTATION')} type="button">
        <i className="bi bi-chat-square-text"></i>
        <strong>Request consultation</strong>
        <span>Ask the pharmacy to review your situation, chat if needed, then create an order.</span>
      </button>
      <button className="pharmacy-mode-card" onClick={() => onChoose('ORDER_REQUEST')} type="button">
        <i className="bi bi-prescription2"></i>
        <strong>Order from prescription</strong>
        <span>Send an existing prescription for pricing and fulfillment. No consultation.</span>
      </button>
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

function PharmacySelectionStep({ userId, geolocation, deliveryContact, prescriptionHeaderId, onSelect, onBack }) {
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deliveryOnly, setDeliveryOnly] = useState(false);
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
      .then((data) => setPharmacies(Array.isArray(data) ? data : []))
      .catch(() => toast.error('Unable to load pharmacies.'))
      .finally(() => setLoading(false));
  }, [userId, deliveryOnly, prescriptionHeaderId, refLat, refLng]);

  const filtered = pharmacies.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (p.name || '').toLowerCase().includes(q) || (p.address || '').toLowerCase().includes(q);
  });

  const stockBadge = (status) => {
    if (status === 'FULL') return { cls: 'bg-success', label: 'Du thuoc' };
    if (status === 'PARTIAL') return { cls: 'bg-warning text-dark', label: 'Thieu mot phan' };
    return { cls: 'bg-secondary', label: 'Chua co du lieu kho' };
  };

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
        <div className="form-check form-switch">
          <input className="form-check-input" type="checkbox" id="deliveryOnly"
            checked={deliveryOnly} onChange={(e) => setDeliveryOnly(e.target.checked)} />
          <label className="form-check-label" htmlFor="deliveryOnly">Delivery only</label>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-shop" style={{ fontSize: '3rem' }}></i>
          <p className="mt-2">No pharmacies found.</p>
        </div>
      ) : (
        <div className="row g-3">
          {filtered.map((p) => {
            const badge = prescriptionHeaderId ? stockBadge(p.stockStatus) : null;
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
                      {p.deliveryAvailable && (
                        <span className="me-3"><i className="bi bi-truck text-info me-1"></i>Delivery</span>
                      )}
                      {badge && (
                        <span className={`badge ${badge.cls} me-1`}>{badge.label}</span>
                      )}
                    </div>
                    {prescriptionHeaderId && p.missingItems?.length > 0 && (
                      <div className="small text-danger mb-2">
                        <i className="bi bi-exclamation-triangle me-1"></i>
                        Missing: {p.missingItems.slice(0, 3).map((m) => m.medicationName).join(', ')}
                        {p.missingItems.length > 3 && ` +${p.missingItems.length - 3} more`}
                      </div>
                    )}
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

function DeliveryContactStep({ profile, geolocation, geoTried, onBack, onContinue }) {
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
      setAddress(result.formattedAddress || '');
      setLatitude(result.latitude);
      setLongitude(result.longitude);
      setSource('DEVICE_LOCATION');
      toast.success('Delivery address updated from current location.');
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

  const geocodeManualAddress = async () => {
    if (!address.trim()) {
      toast.error('Please enter a delivery address.');
      return;
    }
    setSaving(true);
    try {
      const result = await pharmacyApi.geocodeAddress(address.trim());
      setAddress(result.formattedAddress || address.trim());
      setLatitude(result.latitude);
      setLongitude(result.longitude);
      setSource('MANUAL');
      toast.success('Delivery address verified.');
    } catch (error) {
      const msg = error.response?.data?.message || '';
      if (msg.includes('API key is not configured')) {
        toast.error('Google Maps service is not configured. Please contact support.');
      } else {
        toast.error(msg || 'Unable to verify this address.');
      }
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    if (!phone.trim()) {
      toast.error('Please enter a delivery phone number.');
      return;
    }
    if (!address.trim()) {
      toast.error('Please enter a delivery address.');
      return;
    }
    if (latitude == null || longitude == null) {
      await geocodeManualAddress();
      return;
    }
    onContinue({
      deliveryType: 'Delivery',
      deliveryAddress: address.trim(),
      deliveryLatitude: latitude,
      deliveryLongitude: longitude,
      deliveryPhoneNumber: phone.trim(),
      deliveryAddressSource: source,
    });
  };

  return (
    <div className="delivery-contact-card">
      <div className="delivery-contact-header">
        <div>
          <h5 className="fw-semibold mb-1">Delivery contact</h5>
          <p className="text-muted small mb-0">Choose where the pharmacy should send the order.</p>
        </div>
      </div>
      <label className="form-label small">Receiver phone</label>
      <input className="form-control mb-3" value={phone} onChange={(e) => setPhone(e.target.value)} />

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
        <button className="btn btn-outline-secondary btn-sm" disabled={saving || !address.trim()} onClick={geocodeManualAddress} type="button">
          <i className="bi bi-geo-alt me-1"></i>Verify address
        </button>
      </div>

      {latitude != null && longitude != null && (
        <p className="small text-success mb-3">
          <i className="bi bi-check-circle me-1"></i>Location verified: {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </p>
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
              {o.paymentStatus && (
                <span className={`badge ${o.paymentStatus === 'PAID' ? 'bg-success' : 'bg-warning'}`}>{o.paymentStatus}</span>
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
              toast.success('Payment successful!');
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

function OrderDetailView({ orderId, userId, navigate }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [confirmedForPayment, setConfirmedForPayment] = useState(false);
  const [revisionReason, setRevisionReason] = useState('');
  const [requestingRevision, setRequestingRevision] = useState(false);
  const [showRevisionForm, setShowRevisionForm] = useState(false);

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

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await pharmacyApi.cancelOrder(order.orderId, { cancelReason: 'Patient requested cancellation' });
      toast.success('Order cancelled.');
      await loadOrder();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to cancel order.');
    } finally {
      setCancelling(false);
    }
  };

  const handleConfirmOrder = () => {
    setConfirmedForPayment(true);
    toast.success('Order confirmed! You can now proceed to payment.');
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

  const isRevisionRequested = order.status === 'REVISION_REQUESTED';
  const isPaid = order.paymentStatus === 'PAID';
  const isRetailOrder = !order.prescriptionHeaderId && !order.pharmacyRequestId;
  const retailAwaitingConfirmation = isRetailOrder && order.status === 'PENDING' && !isPaid;
  const needsPayment = !isPaid
    && !['CANCELLED', 'REFUNDED'].includes(order.status)
    && !isRevisionRequested
    && !retailAwaitingConfirmation;
  const canCancel = ['PENDING', 'CONFIRMED'].includes(order.status);
  const canRequestRevision = needsPayment && !isRevisionRequested;
  const showConfirmButton = needsPayment && !confirmedForPayment;
  const showPayPal = needsPayment && confirmedForPayment;

  return (
    <div>
      <div className="d-flex align-items-center gap-3 mb-4">
        <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate('/patient-dashboard/pharmacy/orders')}>
          <i className="bi bi-arrow-left"></i>
        </button>
        <h4 className="mb-0">Order {order.orderNumber || `#${orderId}`}</h4>
        <span className={`badge bg-${statusBadge(order.status)}`}>{titleCase(order.status)}</span>
        {order.paymentStatus && (
          <span className={`badge ${isPaid ? 'bg-success' : 'bg-warning'}`}>{order.paymentStatus}</span>
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
                          <td>${Number(item.unitPrice || item.price || 0).toFixed(2)}</td>
                          <td>${Number((item.unitPrice || item.price || 0) * (item.quantity || 1)).toFixed(2)}</td>
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
          {showConfirmButton && (
            <div className="card shadow-sm mb-3 border-primary">
              <div className="card-body text-center">
                <h6 className="fw-semibold mb-3 text-primary">Confirm Order</h6>
                <p className="small text-muted mb-3">Review the order details. Once confirmed, PayPal payment will be available.</p>
                <button className="btn btn-primary w-100" onClick={handleConfirmOrder}>
                  <i className="bi bi-check-circle me-2"></i>Confirm Order
                </button>
              </div>
            </div>
          )}

          {showPayPal && (
            <div className="card shadow-sm mb-3">
              <div className="card-body text-center">
                <h6 className="fw-semibold mb-3">Payment</h6>
                <p className="small text-muted mb-3">Pay with PayPal to complete your order.</p>
                <PharmacyPayPalButton
                  order={order}
                  onPaid={handlePaid}
                  onCancel={handlePayPalCancel}
                  onError={handlePayPalError}
                  onFail={handlePayPalFail}
                />
              </div>
            </div>
          )}

          {canRequestRevision && !showRevisionForm && (
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

          {canRequestRevision && showRevisionForm && (
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

          {canCancel && (
            <div className="card shadow-sm">
              <div className="card-body text-center">
                <h6 className="fw-semibold mb-3 text-danger">Cancel Order</h6>
                <p className="small text-muted mb-3">Cancel this order if you no longer need it.</p>
                <button className="btn btn-outline-danger w-100" disabled={cancelling} onClick={handleCancel}>
                  {cancelling ? 'Cancelling...' : 'Cancel Order'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
