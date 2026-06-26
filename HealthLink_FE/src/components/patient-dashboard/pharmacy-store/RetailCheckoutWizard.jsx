import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import pharmacyApi from '../../../api/pharmacyApi';
import { cartSubtotal, getMedicineDisplayName, money, toCartPayload } from './retailStoreUtils';

const STEPS = ['delivery', 'pharmacy', 'review'];

export default function RetailCheckoutWizard({
  items,
  patientProfile,
  geolocation,
  geoTried,
  onClose,
  onCreated,
}) {
  const [step, setStep] = useState('delivery');
  const [deliveryContact, setDeliveryContact] = useState({
    deliveryType: 'Delivery',
    deliveryAddress: '',
    deliveryLatitude: null,
    deliveryLongitude: null,
    deliveryPhoneNumber: '',
    deliveryAddressSource: 'PROFILE',
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
  }, [patientProfile]);

  useEffect(() => {
    if (step !== 'pharmacy') {
      return undefined;
    }

    const loadPharmacies = async () => {
      setLoadingPharmacies(true);
      try {
        const result = await pharmacyApi.getRetailRecommendations({
          lat: deliveryContact.deliveryLatitude,
          lng: deliveryContact.deliveryLongitude,
          deliveryOnly: true,
          items: toCartPayload(items),
        });
        setPharmacies(Array.isArray(result) ? result : []);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Unable to load pharmacies for this cart.');
        setPharmacies([]);
      } finally {
        setLoadingPharmacies(false);
      }
    };

    if (deliveryContact.deliveryLatitude != null && deliveryContact.deliveryLongitude != null) {
      loadPharmacies();
    }

    return undefined;
  }, [deliveryContact.deliveryLatitude, deliveryContact.deliveryLongitude, items, step]);

  const subtotal = useMemo(() => cartSubtotal(items), [items]);
  const reviewTotal = Number(selectedPharmacy?.medicineSubtotal ?? subtotal) + Number(selectedPharmacy?.deliveryFee ?? 0);

  const verifyManualAddress = async () => {
    if (!deliveryContact.deliveryAddress.trim()) {
      toast.error('Please enter a delivery address.');
      return false;
    }

    setSavingAddress(true);
    try {
      const result = await pharmacyApi.geocodeAddress(deliveryContact.deliveryAddress.trim());
      setDeliveryContact((current) => ({
        ...current,
        deliveryAddress: result.formattedAddress || current.deliveryAddress.trim(),
        deliveryLatitude: result.latitude,
        deliveryLongitude: result.longitude,
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

    setStep('pharmacy');
  };

  const handleSelectPharmacy = (pharmacy) => {
    if (pharmacy.stockStatus !== 'FULL') {
      const confirmed = window.confirm('This pharmacy may not have every cart item. Continue?');
      if (!confirmed) {
        return;
      }
    }

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
      const order = await pharmacyApi.createRetailOrder({
        pharmacyId: selectedPharmacy.pharmacyId,
        deliveryType: deliveryContact.deliveryType,
        deliveryAddress: deliveryContact.deliveryAddress,
        deliveryLatitude: deliveryContact.deliveryLatitude,
        deliveryLongitude: deliveryContact.deliveryLongitude,
        deliveryPhoneNumber: deliveryContact.deliveryPhoneNumber,
        deliveryAddressSource: deliveryContact.deliveryAddressSource,
        paymentMethod: 'EWallet',
        items: toCartPayload(items),
      });
      toast.success('Retail order created.');
      onCreated(order);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to create retail order.');
    } finally {
      setSubmitting(false);
    }
  };

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

        {step === 'delivery' && (
          <div>
            <label className="form-label small">Receiver phone</label>
            <input
              className="form-control mb-3"
              value={deliveryContact.deliveryPhoneNumber}
              onChange={(event) => setDeliveryContact((current) => ({
                ...current,
                deliveryPhoneNumber: event.target.value,
              }))}
            />

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

            {deliveryContact.deliveryLatitude != null && deliveryContact.deliveryLongitude != null && (
              <div className="alert alert-success small py-2">
                <i className="bi bi-check-circle me-1"></i>
                Location verified: {deliveryContact.deliveryLatitude.toFixed(5)}, {deliveryContact.deliveryLongitude.toFixed(5)}
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
              <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => setStep('delivery')}>
                Back
              </button>
            </div>

            {loadingPharmacies ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status"></div>
              </div>
            ) : pharmacies.length === 0 ? (
              <div className="alert alert-warning mb-0">No pharmacies found for this cart and delivery location.</div>
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
                      <span className={`badge ${
                        pharmacy.stockStatus === 'FULL'
                          ? 'text-bg-success'
                          : pharmacy.stockStatus === 'PARTIAL'
                            ? 'text-bg-warning'
                            : 'text-bg-secondary'
                      }`}>{pharmacy.stockStatus}</span>
                      <span className="text-muted">Delivery fee: {money(pharmacy.deliveryFee)}</span>
                      {pharmacy.averageRating != null && (
                        <span className="text-muted">
                          <i className="bi bi-star-fill text-warning me-1"></i>
                          {Number(pharmacy.averageRating).toFixed(1)}
                        </span>
                      )}
                    </div>
                    {pharmacy.missingItems?.length > 0 && (
                      <div className="small text-danger mt-2">
                        <i className="bi bi-exclamation-triangle me-1"></i>
                        Missing: {pharmacy.missingItems.slice(0, 3).map((item) => item.medicineName).join(', ')}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 'review' && selectedPharmacy && (
          <div>
            {selectedPharmacy.stockStatus !== 'FULL' && (
              <div className="alert alert-warning">
                <i className="bi bi-exclamation-triangle me-2"></i>
                This pharmacy may not have every item in your cart. The pharmacy can still confirm, revise, or cancel after review.
              </div>
            )}

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
                    <h6 className="fw-semibold">Delivery</h6>
                    <div>{deliveryContact.deliveryPhoneNumber}</div>
                    <div className="small text-muted">{deliveryContact.deliveryAddress}</div>
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
                <strong>{money(selectedPharmacy.deliveryFee)}</strong>
              </div>
              <div className="d-flex justify-content-between retail-review-total">
                <span>Total</span>
                <strong>{money(reviewTotal)}</strong>
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
