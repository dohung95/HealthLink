import { useMemo, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import pharmacyApi from '../../../api/pharmacyApi';
import { canEditDeliveryAddress } from './deliveryContactPolicy';
import { getAddressVerificationError } from './addressVerification';

function PinSelector({ onSelect }) {
  useMapEvents({
    click(event) {
      onSelect(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

export default function DeliveryContactEditor({ order, onCancel, onSubmit, saving }) {
  const [address, setAddress] = useState(order?.deliveryAddress || '');
  const [phone, setPhone] = useState(order?.deliveryPhoneNumber || '');
  const [reason, setReason] = useState('');
  const [coordinates, setCoordinates] = useState({
    latitude: order?.deliveryLatitude ?? null,
    longitude: order?.deliveryLongitude ?? null,
    source: order?.deliveryAddressSource || 'MANUAL',
  });
  const [addressVerified, setAddressVerified] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError] = useState('');
  const addressEditable = canEditDeliveryAddress(order);
  const addressChanged = address.trim() !== String(order?.deliveryAddress || '').trim();
  const center = useMemo(() => (
    Number.isFinite(Number(coordinates.latitude)) && Number.isFinite(Number(coordinates.longitude))
      ? [Number(coordinates.latitude), Number(coordinates.longitude)]
      : [10.7769, 106.7009]
  ), [coordinates.latitude, coordinates.longitude]);

  const verifyAddress = async () => {
    if (!address.trim()) {
      setError('Enter an address before verifying its location.');
      return;
    }
    setGeocoding(true);
    setError('');
    try {
      const result = await pharmacyApi.geocodeAddress(address.trim());
      setAddress(result.formattedAddress || address.trim());
      setCoordinates({ latitude: result.latitude, longitude: result.longitude, source: 'MANUAL' });
      setAddressVerified(true);
    } catch (requestError) {
      setError(getAddressVerificationError(requestError));
    } finally {
      setGeocoding(false);
    }
  };

  const submit = () => {
    if (!phone.trim()) {
      setError('Phone number is required.');
      return;
    }
    if (!addressChanged) {
      onSubmit({
        kind: 'PHONE_ONLY',
        payload: {
          deliveryAddress: order.deliveryAddress,
          deliveryLatitude: order.deliveryLatitude,
          deliveryLongitude: order.deliveryLongitude,
          deliveryAddressSource: order.deliveryAddressSource,
          deliveryPhoneNumber: phone.trim(),
        },
      });
      return;
    }
    if (!addressEditable) {
      setError('Address changes are no longer available for this order.');
      return;
    }
    if (!addressVerified || !Number.isFinite(Number(coordinates.latitude)) || !Number.isFinite(Number(coordinates.longitude))) {
      setError('Verify and confirm the new location on the map.');
      return;
    }
    if (!reason.trim()) {
      setError('A reason is required for an address change.');
      return;
    }
    onSubmit({
      kind: 'ADDRESS_CHANGE',
      payload: {
        deliveryAddress: address.trim(),
        deliveryLatitude: Number(coordinates.latitude),
        deliveryLongitude: Number(coordinates.longitude),
        deliveryAddressSource: coordinates.source,
        deliveryPhoneNumber: phone.trim(),
        reason: reason.trim(),
      },
    });
  };

  return (
    <div className="card shadow-sm mb-3 border-primary">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div><h6 className="fw-semibold mb-1">Delivery details</h6><small className="text-muted">Phone updates apply immediately. Address changes require pharmacy review.</small></div>
          <button aria-label="Close delivery details editor" className="btn btn-sm btn-light" disabled={saving} onClick={onCancel} type="button"><i className="bi bi-x-lg" /></button>
        </div>
        <div className="mb-2"><label className="form-label small">Phone</label><input className="form-control form-control-sm" onChange={(event) => setPhone(event.target.value)} type="tel" value={phone} /></div>
        <div className="mb-2"><label className="form-label small">Address</label><div className="input-group input-group-sm"><input className="form-control" disabled={!addressEditable} onChange={(event) => { setAddress(event.target.value); setAddressVerified(false); }} value={address} /><button className="btn btn-outline-primary" disabled={!addressEditable || geocoding} onClick={verifyAddress} type="button">{geocoding ? 'Verifying...' : 'Verify'}</button></div></div>
        {addressChanged && addressEditable && <>
          <div className="mb-2"><label className="form-label small">Reason for address change</label><textarea className="form-control form-control-sm" onChange={(event) => setReason(event.target.value)} rows="2" value={reason} /></div>
          <div className="border rounded overflow-hidden mb-3" style={{ height: 220 }}>
            <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <PinSelector onSelect={(latitude, longitude) => { setCoordinates({ latitude, longitude, source: 'MAP_PIN' }); setAddressVerified(true); }} />
              {Number.isFinite(Number(coordinates.latitude)) && Number.isFinite(Number(coordinates.longitude)) && <Marker position={center} />}
            </MapContainer>
          </div>
          <small className={addressVerified ? 'text-success d-block mb-2' : 'text-muted d-block mb-2'}>{addressVerified ? 'Location confirmed.' : 'Verify the address or place a pin on the map.'}</small>
        </>}
        {error && <div className="alert alert-danger py-2 small">{error}</div>}
        <div className="d-flex gap-2"><button className="btn btn-primary btn-sm flex-grow-1" disabled={saving} onClick={submit} type="button">{saving ? 'Saving...' : addressChanged ? 'Send for review' : 'Save phone'}</button><button className="btn btn-outline-secondary btn-sm" disabled={saving} onClick={onCancel} type="button">Cancel</button></div>
      </div>
    </div>
  );
}
