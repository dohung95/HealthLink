import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import pharmacyApi from '../../../api/pharmacyApi';
import { cartSubtotal, getMedicineDisplayName, money, toCartPayload } from './retailStoreUtils';
import { applyManualGeocodeResult } from './manualAddressPolicy';

const STEPS = ['fulfillment', 'pharmacy', 'review'];

export default function RetailCheckoutWizard({
  items,
  patientProfile,
  geolocation,
  geoTried,
  onClose,
  onCreated,
}) {
  const [step, setStep] = useState('fulfillment');
  const [fulfillmentType, setFulfillmentType] = useState('Delivery');
  const [deliveryContact, setDeliveryContact] = useState({
    deliveryAddress: '',
    deliveryLatitude: null,
    deliveryLongitude: null,
    deliveryPhoneNumber: '',
    deliveryAddressSource: 'PROFILE',
  });
  const [pickupContact, setPickupContact] = useState({
    phoneNumber: '',
    areaText: '',
    latitude: null,
    longitude: null,
  });
  const [pharmacies, setPharmacies] = useState([]);
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);
  const [loadingPharmacies, setLoadingPharmacies] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  useEffect(() => {
    const profileAddress = [patientProfile?.address, patientProfile?.city, patientProfile?.country]
      .filter(Boolean)
      .join(', ');

    setDeliveryContact((current) => ({
      ...current,
      deliveryAddress: current.deliveryAddress || profileAddress,
      deliveryLatitude: current.deliveryLatitude ?? patientProfile?.latitude ?? null,
      deliveryLongitude: current.deliveryLongitude ?? patientProfile?.longitude ?? null,
      deliveryPhoneNumber: current.deliveryPhoneNumber || patientProfile?.phoneNumber || '',
      deliveryAddressSource: current.deliveryAddressSource || 'PROFILE',
    }));

    setPickupContact((current) => ({
      ...current,
      phoneNumber: current.phoneNumber || patientProfile?.phoneNumber || '',
    }));
  }, [patientProfile]);

  useEffect(() => {
    if (step !== 'pharmacy') {
      return undefined;
    }

    const loadPharmacies = async () => {
      setLoadingPharmacies(true);
      try {
        const lat = fulfillmentType === 'Delivery' ? deliveryContact.deliveryLatitude : pickupContact.latitude;
        const lng = fulfillmentType === 'Delivery' ? deliveryContact.deliveryLongitude : pickupContact.longitude;
        const result = await pharmacyApi.getRetailRecommendations({
          lat,
          lng,
          deliveryOnly: fulfillmentType === 'Delivery',
          fulfillmentType,
          items: toCartPayload(items),
        });
        setPharmacies(Array.isArray(result) ? result.filter((pharmacy) => pharmacy.stockStatus === 'FULL') : []);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Unable to load pharmacies for this cart.');
        setPharmacies([]);
      } finally {
        setLoadingPharmacies(false);
      }
    };

    const lat = fulfillmentType === 'Delivery' ? deliveryContact.deliveryLatitude : pickupContact.latitude;
    const lng = fulfillmentType === 'Delivery' ? deliveryContact.deliveryLongitude : pickupContact.longitude;
    if (lat != null && lng != null) {
      loadPharmacies();
    }

    return undefined;
  }, [
    fulfillmentType,
    deliveryContact.deliveryLatitude,
    deliveryContact.deliveryLongitude,
    pickupContact.latitude,
    pickupContact.longitude,
    items,
    step,
  ]);

  const subtotal = useMemo(() => cartSubtotal(items), [items]);

  const verifyManualAddress = async () => {
    if (!deliveryContact.deliveryAddress.trim()) {
      toast.error('Please enter a delivery address.');
      return false;
    }

    setSavingAddress(true);
    try {
      const result = await pharmacyApi.geocodeAddress(deliveryContact.deliveryAddress.trim());
      const verified = applyManualGeocodeResult(deliveryContact.deliveryAddress, result);
      setDeliveryContact((current) => ({
        ...current,
        deliveryAddress: verified.address,
        deliveryLatitude: verified.latitude,
        deliveryLongitude: verified.longitude,
        deliveryAddressSource: 'MANUAL',
      }));
      toast.success('Delivery address verified.');
      return true;
    } catch (error) {
      const message = error.response?.data?.message || 'Unable to verify this address.';
      toast.error(message);
      return false;
    } finally {
      setSavingAddress(false);
    }
  };

  const verifyPickupArea = async () => {
    if (!pickupContact.areaText.trim()) {
      toast.error('Please enter a pickup area or location.');
      return false;
    }

    setSavingAddress(true);
    try {
      const result = await pharmacyApi.geocodeAddress(pickupContact.areaText.trim());
      const verified = applyManualGeocodeResult(pickupContact.areaText, result);
      setPickupContact((current) => ({
        ...current,
        areaText: verified.address,
        latitude: verified.latitude,
        longitude: verified.longitude,
      }));
      toast.success('Pickup area verified.');
      return true;
    } catch (error) {
      const message = error.response?.data?.message || 'Unable to verify this area.';
      toast.error(message);
      return false;
    } finally {
      setSavingAddress(false);
    }
  };

  const useCurrentLocation = async () => {
    if (!geolocation) {
      toast.error(geoTried ? 'Can not access your device location.' : 'Still trying to access your location.');
      return;
    }

    setSavingAddress(true);
    try {
      const result = await pharmacyApi.reverseGeocode({
        latitude: geolocation.lat,
        longitude: geolocation.lng,
      });
      setDeliveryContact((current) => ({
        ...current,
        deliveryAddress: result.formattedAddress || '',
        deliveryLatitude: result.latitude,
        deliveryLongitude: result.longitude,
        deliveryAddressSource: 'DEVICE_LOCATION',
      }));
      toast.success('Delivery address updated from current location.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to resolve current location.');
    } finally {
      setSavingAddress(false);
    }
  };

  const goToPharmacyStep = async () => {
    if (fulfillmentType === 'Delivery') {
      if (!deliveryContact.deliveryPhoneNumber.trim()) {
        toast.error('Please enter a delivery phone number.');
        return;
      }
      if (!deliveryContact.deliveryAddress.trim()) {
        toast.error('Please enter a delivery address.');
        return;
      }
      if (deliveryContact.deliveryLatitude == null || deliveryContact.deliveryLongitude == null) {
        const verified = await verifyManualAddress();
        if (!verified) {
          return;
        }
      }
    } else {
      if (!pickupContact.phoneNumber.trim()) {
        toast.error('Please enter a phone number.');
        return;
      }
      if (pickupContact.latitude == null || pickupContact.longitude == null) {
        const verified = await verifyPickupArea();
        if (!verified) {
          return;
        }
      }
    }

    setStep('pharmacy');
  };

  const handleSelectPharmacy = (pharmacy) => {
    setSelectedPharmacy(pharmacy);
    setStep('review');
  };

  const handleSubmit = async () => {
    if (!selectedPharmacy) {
      toast.error('Please choose a pharmacy.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        pharmacyId: selectedPharmacy.pharmacyId,
        deliveryType: fulfillmentType,
        deliveryPhoneNumber: fulfillmentType === 'Delivery' ? deliveryContact.deliveryPhoneNumber : pickupContact.phoneNumber,
        paymentMethod: 'EWallet',
        items: toCartPayload(items),
      };

      if (fulfillmentType === 'Delivery') {
        payload.deliveryAddress = deliveryContact.deliveryAddress;
        payload.deliveryLatitude = deliveryContact.deliveryLatitude;
        payload.deliveryLongitude = deliveryContact.deliveryLongitude;
        payload.deliveryAddressSource = deliveryContact.deliveryAddressSource;
      }

      const order = await pharmacyApi.createRetailOrder(payload);

      const isPending = order.requiresPatientConfirmation || (fulfillmentType === 'Delivery' && order.status === 'PENDING');
      const isConfirmed = fulfillmentType === 'Pickup' && order.status === 'CONFIRMED';

      if (isPending) {
        toast.success('Order submitted. Awaiting pharmacy quote confirmation.');
      } else if (isConfirmed) {
        toast.success('Order confirmed! Ready for pickup.');
      } else {
        toast.success('Retail order created.');
      }

      onCreated(order);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to create retail order.');
    } finally {
      setSubmitting(false);
    }
  };

  const phoneNumber = fulfillmentType === 'Delivery' ? deliveryContact.deliveryPhoneNumber : pickupContact.phoneNumber;
  const locationLat = fulfillmentType === 'Delivery' ? deliveryContact.deliveryLatitude : pickupContact.latitude;
  const locationLng = fulfillmentType === 'Delivery' ? deliveryContact.deliveryLongitude : pickupContact.longitude;

  return (
    <div className="retail-checkout-backdrop">
      <div className="retail-checkout-shell">
        <div className="d-flex align-items-start justify-content-between gap-3 mb-4">
          <div>
            <h4 className="mb-1">Retail Checkout</h4>
            <div className="small text-muted">Confirm delivery, compare pharmacies, then submit your order.</div>
          </div>
          <button className="btn btn-outline-secondary btn-sm" type="button" onClick={onClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className="retail-checkout-steps mb-4">
          {STEPS.map((name, index) => {
            const active = step === name;
            const completed = STEPS.indexOf(step) > index;
            return (
              <div key={name} className={`retail-checkout-step ${active ? 'active' : ''} ${completed ? 'completed' : ''}`}>
                <span>{index + 1}</span>
                <strong>{name.charAt(0).toUpperCase() + name.slice(1)}</strong>
              </div>
            );
          })}
        </div>

        {step === 'fulfillment' && (
          <div>
            <div className="mb-3">
              <label className="form-label small">Fulfillment type</label>
              <div className="d-flex gap-2">
                <button
                  className={`btn btn-sm ${fulfillmentType === 'Delivery' ? 'btn-primary' : 'btn-outline-primary'}`}
                  type="button"
                  onClick={() => setFulfillmentType('Delivery')}
                >
                  <i className="bi bi-truck me-1"></i>Delivery
                </button>
                <button
                  className={`btn btn-sm ${fulfillmentType === 'Pickup' ? 'btn-primary' : 'btn-outline-primary'}`}
                  type="button"
                  onClick={() => setFulfillmentType('Pickup')}
                >
                  <i className="bi bi-shop me-1"></i>Pickup
                </button>
              </div>
            </div>

            <label className="form-label small">Contact phone</label>
            <input
              className="form-control mb-3"
              value={phoneNumber}
              onChange={(event) => {
                const value = event.target.value;
                if (fulfillmentType === 'Delivery') {
                  setDeliveryContact((current) => ({ ...current, deliveryPhoneNumber: value }));
                } else {
                  setPickupContact((current) => ({ ...current, phoneNumber: value }));
                }
              }}
            />

            {fulfillmentType === 'Delivery' && (
              <>
                <label className="form-label small">Delivery address</label>
                <textarea
                  className="form-control mb-2"
                  rows="3"
                  value={deliveryContact.deliveryAddress}
                  onChange={(event) => setDeliveryContact((current) => ({
                    ...current,
                    deliveryAddress: event.target.value,
                    deliveryLatitude: null,
                    deliveryLongitude: null,
                    deliveryAddressSource: 'MANUAL',
                  }))}
                />

                <div className="d-flex flex-wrap gap-2 mb-3">
                  <button className="btn btn-outline-primary btn-sm" type="button" disabled={savingAddress} onClick={useCurrentLocation}>
                    <i className="bi bi-crosshair me-1"></i>Use current location
                  </button>
                  <button className="btn btn-outline-secondary btn-sm" type="button" disabled={savingAddress} onClick={verifyManualAddress}>
                    <i className="bi bi-geo-alt me-1"></i>Verify address
                  </button>
                </div>
              </>
            )}

            {fulfillmentType === 'Pickup' && (
              <>
                <label className="form-label small">Pickup area / location</label>
                <input
                  className="form-control mb-2"
                  value={pickupContact.areaText}
                  onChange={(event) => setPickupContact((current) => ({
                    ...current,
                    areaText: event.target.value,
                    latitude: null,
                    longitude: null,
                  }))}
                  placeholder="Enter a city, district, or area"
                />

                <div className="d-flex flex-wrap gap-2 mb-3">
                  <button className="btn btn-outline-secondary btn-sm" type="button" disabled={savingAddress} onClick={verifyPickupArea}>
                    <i className="bi bi-geo-alt me-1"></i>Verify area
                  </button>
                </div>
              </>
            )}

            {locationLat != null && locationLng != null && (
              <div className="alert alert-success small py-2">
                <i className="bi bi-check-circle me-1"></i>
                Location verified: {locationLat.toFixed(5)}, {locationLng.toFixed(5)}
              </div>
            )}

            <div className="d-flex justify-content-end gap-2">
              <button className="btn btn-outline-secondary" type="button" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" type="button" onClick={goToPharmacyStep} disabled={savingAddress}>
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 'pharmacy' && (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="small text-muted">Sorted by distance, stock status, and rating.</div>
              <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => setStep('fulfillment')}>
                Back
              </button>
            </div>

            {loadingPharmacies ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status"></div>
              </div>
            ) : pharmacies.length === 0 ? (
              <div className="alert alert-warning mb-0">
  No pharmacies can fulfill every item in this cart for the selected location.</div>
            ) : (
              <div className="retail-pharmacy-list">
                {pharmacies.map((pharmacy) => (
                  <button
                    key={pharmacy.pharmacyId}
                    className="retail-pharmacy-option"
                    type="button"
                    onClick={() => handleSelectPharmacy(pharmacy)}
                  >
                    <div className="d-flex justify-content-between gap-3">
                      <div>
                        <div className="fw-semibold">{pharmacy.name}</div>
                        <div className="small text-muted">{pharmacy.address}</div>
                      </div>
                      <div className="text-end">
                        <div className="fw-semibold">{money(Number(pharmacy.medicineSubtotal || 0) + Number(pharmacy.deliveryFee || 0))}</div>
                        <div className="small text-muted">{pharmacy.distanceLabel || 'Distance unavailable'}</div>
                      </div>
                    </div>
                    <div className="d-flex flex-wrap gap-2 mt-2 small">
                      <span className="text-muted">Delivery fee: {money(pharmacy.deliveryFee)}</span>
                      {pharmacy.averageRating != null && (
                        <span className="text-muted">
                          <i className="bi bi-star-fill text-warning me-1"></i>
                          {Number(pharmacy.averageRating).toFixed(1)}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 'review' && selectedPharmacy && (
          <div>
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <div className="card h-100">
                  <div className="card-body">
                    <h6 className="fw-semibold">Pharmacy</h6>
                    <div>{selectedPharmacy.name}</div>
                    <div className="small text-muted">{selectedPharmacy.address}</div>
                    <div className="small text-muted mt-2">Delivery fee: {money(selectedPharmacy.deliveryFee)}</div>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="card h-100">
                  <div className="card-body">
                    <h6 className="fw-semibold">{fulfillmentType === 'Delivery' ? 'Delivery' : 'Pickup location'}</h6>
                    <div>{phoneNumber}</div>
                    <div className="small text-muted">
                      {fulfillmentType === 'Delivery' ? deliveryContact.deliveryAddress : pickupContact.areaText}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card mb-3">
              <div className="card-body">
                <h6 className="fw-semibold mb-3">Cart</h6>
                <div className="retail-review-items">
                  {items.map((item) => (
                    <div className="d-flex justify-content-between gap-3" key={item.medicineId}>
                      <div>
                        <div className="fw-medium">{getMedicineDisplayName(item)}</div>
                        <div className="small text-muted">Qty {item.quantity}</div>
                      </div>
                      <div className="fw-medium">{money(Number(item.price || 0) * Number(item.quantity || 0))}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="retail-review-summary">
              <div className="d-flex justify-content-between">
                <span>Medicine subtotal</span>
                <strong>{money(selectedPharmacy.medicineSubtotal ?? subtotal)}</strong>
              </div>
              <div className="d-flex justify-content-between">
                <span>Delivery fee</span>
                <strong>
                  {fulfillmentType === 'Delivery'
                    ? 'To be confirmed by pharmacy'
                    : money(0)}
                </strong>
              </div>
              <div className="d-flex justify-content-between retail-review-total">
                <span>Total</span>
                <strong>{money(selectedPharmacy.medicineSubtotal ?? subtotal)}</strong>
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2 mt-4">
              <button className="btn btn-outline-secondary" type="button" onClick={() => setStep('pharmacy')}>
                Back
              </button>
              <button className="btn btn-primary" type="button" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Order'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
