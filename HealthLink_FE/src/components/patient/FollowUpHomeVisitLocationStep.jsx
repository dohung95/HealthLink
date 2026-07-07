import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const MapClickHandler = ({ onSelect }) => {
  useMapEvents({
    click(event) {
      onSelect({
        visitLatitude: event.latlng.lat,
        visitLongitude: event.latlng.lng,
      });
    },
  });
  return null;
};

const validateLocation = (form) => {
  const errors = {};
  if (!form.visitAddress?.trim()) errors.visitAddress = 'Address is required.';
  if (!form.contactPhone?.trim()) errors.contactPhone = 'Contact phone is required.';
  if (!form.reasonForHomeVisit?.trim()) errors.reasonForHomeVisit = 'Reason is required.';
  if (!Number.isFinite(Number(form.visitLatitude)) || !Number.isFinite(Number(form.visitLongitude))) {
    errors.map = 'Select the visit location on the map.';
  }

  if (form.isForSelf === false) {
    if (!form.receiverName?.trim()) errors.receiverName = 'Receiver name is required.';
    if (!Number(form.receiverAge) || Number(form.receiverAge) < 1) errors.receiverAge = 'Receiver age is required.';
    if (!form.receiverRelationship?.trim()) errors.receiverRelationship = 'Relationship is required.';
    if (!form.receiverPhone?.trim()) errors.receiverPhone = 'Receiver phone is required.';
  }

  return errors;
};

const FollowUpHomeVisitLocationStep = ({ value, onChange, onBack, onNext }) => {
  const [errors, setErrors] = React.useState({});

  const center = useMemo(() => {
    const lat = Number(value.visitLatitude);
    const lng = Number(value.visitLongitude);
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
      return [lat, lng];
    }
    return [10.7769, 106.7009];
  }, [value.visitLatitude, value.visitLongitude]);

  const handleField = (field) => (e) => {
    const newVal = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    onChange({ ...value, [field]: newVal });
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleMapSelect = ({ visitLatitude, visitLongitude }) => {
    onChange({ ...value, visitLatitude, visitLongitude });
    if (errors.map) setErrors((prev) => ({ ...prev, map: '' }));
  };

  const handleNext = () => {
    const v = validateLocation(value);
    setErrors(v);
    if (Object.keys(v).length === 0) onNext();
  };

  return (
    <div className="border rounded-3 p-4 bg-white">
      <h5 className="mb-3"><i className="bi bi-geo-alt me-2" />Visit Location</h5>

      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label">Address <span className="text-danger">*</span></label>
          <input
            type="text"
            className={`form-control ${errors.visitAddress ? 'is-invalid' : ''}`}
            value={value.visitAddress}
            onChange={handleField('visitAddress')}
            placeholder="e.g. 123 Le Loi Street"
          />
          {errors.visitAddress && <div className="invalid-feedback">{errors.visitAddress}</div>}
        </div>
        <div className="col-md-6">
          <label className="form-label">City</label>
          <input type="text" className="form-control" value={value.visitCity} onChange={handleField('visitCity')} />
        </div>
        <div className="col-md-6">
          <label className="form-label">Contact Phone <span className="text-danger">*</span></label>
          <input
            type="tel"
            className={`form-control ${errors.contactPhone ? 'is-invalid' : ''}`}
            value={value.contactPhone}
            onChange={handleField('contactPhone')}
          />
          {errors.contactPhone && <div className="invalid-feedback">{errors.contactPhone}</div>}
        </div>
        <div className="col-md-6">
          <label className="form-label">Reason for Home Visit <span className="text-danger">*</span></label>
          <textarea
            className={`form-control ${errors.reasonForHomeVisit ? 'is-invalid' : ''}`}
            rows={2}
            value={value.reasonForHomeVisit}
            onChange={handleField('reasonForHomeVisit')}
          />
          {errors.reasonForHomeVisit && <div className="invalid-feedback">{errors.reasonForHomeVisit}</div>}
        </div>
        <div className="col-12">
          <label className="form-label">Special Notes</label>
          <textarea className="form-control" rows={2} value={value.specialNotes} onChange={handleField('specialNotes')} />
        </div>
      </div>

      <div className="form-check mt-3">
        <input type="checkbox" className="form-check-input" id="isForSelf" checked={value.isForSelf !== false} onChange={handleField('isForSelf')} />
        <label className="form-check-label" htmlFor="isForSelf">This is for myself</label>
      </div>

      {value.isForSelf === false && (
        <div className="row g-3 mt-2 p-3 border rounded-3 bg-light">
          <h6 className="mb-0">Receiver Details</h6>
          <div className="col-md-4">
            <label className="form-label">Full Name <span className="text-danger">*</span></label>
            <input type="text" className={`form-control ${errors.receiverName ? 'is-invalid' : ''}`} value={value.receiverName} onChange={handleField('receiverName')} />
            {errors.receiverName && <div className="invalid-feedback">{errors.receiverName}</div>}
          </div>
          <div className="col-md-2">
            <label className="form-label">Age <span className="text-danger">*</span></label>
            <input type="number" className={`form-control ${errors.receiverAge ? 'is-invalid' : ''}`} value={value.receiverAge} onChange={handleField('receiverAge')} />
            {errors.receiverAge && <div className="invalid-feedback">{errors.receiverAge}</div>}
          </div>
          <div className="col-md-3">
            <label className="form-label">Gender</label>
            <select className="form-select" value={value.receiverGender || 'male'} onChange={handleField('receiverGender')}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label">Relationship <span className="text-danger">*</span></label>
            <input type="text" className={`form-control ${errors.receiverRelationship ? 'is-invalid' : ''}`} value={value.receiverRelationship} onChange={handleField('receiverRelationship')} />
            {errors.receiverRelationship && <div className="invalid-feedback">{errors.receiverRelationship}</div>}
          </div>
          <div className="col-md-6">
            <label className="form-label">Phone <span className="text-danger">*</span></label>
            <input type="tel" className={`form-control ${errors.receiverPhone ? 'is-invalid' : ''}`} value={value.receiverPhone} onChange={handleField('receiverPhone')} />
            {errors.receiverPhone && <div className="invalid-feedback">{errors.receiverPhone}</div>}
          </div>
        </div>
      )}

      <div className="mt-3">
        <label className="form-label">
          Pin the visit location on the map <span className="text-danger">*</span>
        </label>
        <div style={{ height: '280px', borderRadius: '4px', overflow: 'hidden' }}>
          <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onSelect={handleMapSelect} />
            {Number.isFinite(Number(value.visitLatitude)) && Number.isFinite(Number(value.visitLongitude)) && (
              <Marker position={[Number(value.visitLatitude), Number(value.visitLongitude)]} />
            )}
          </MapContainer>
        </div>
        {errors.map && <div className="text-danger small mt-1">{errors.map}</div>}
        {Number.isFinite(Number(value.visitLatitude)) && Number.isFinite(Number(value.visitLongitude)) && (
          <small className="text-muted mt-1 d-block">
            Selected: {Number(value.visitLatitude).toFixed(4)}, {Number(value.visitLongitude).toFixed(4)}
          </small>
        )}
      </div>

      <div className="d-flex justify-content-between mt-4">
        <button type="button" className="btn btn-outline-secondary" onClick={onBack}>
          <i className="bi bi-arrow-left me-2" />Back
        </button>
        <button type="button" className="btn btn-primary" onClick={handleNext}>
          Next <i className="bi bi-arrow-right ms-2" />
        </button>
      </div>
    </div>
  );
};

export default FollowUpHomeVisitLocationStep;
