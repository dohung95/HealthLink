import React from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  FOLLOW_UP_MAP_FALLBACK_CENTER,
  hasPinnedFollowUpLocation,
  validateFollowUpHomeVisitLocation,
} from '../../utils/followUpHomeVisitLocation';

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

const FollowUpHomeVisitLocationStep = ({ value, onChange, onBack, onNext }) => {
  const [errors, setErrors] = React.useState({});

  const center = hasPinnedFollowUpLocation(value)
    ? [value.visitLatitude, value.visitLongitude]
    : FOLLOW_UP_MAP_FALLBACK_CENTER;

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
    const validationErrors = validateFollowUpHomeVisitLocation(value);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length === 0) onNext();
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
            <select className={`form-select ${errors.receiverGender ? 'is-invalid' : ''}`} value={value.receiverGender} onChange={handleField('receiverGender')}>
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
            {errors.receiverGender && <div className="invalid-feedback">{errors.receiverGender}</div>}
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
            {hasPinnedFollowUpLocation(value) && (
              <Marker position={[value.visitLatitude, value.visitLongitude]} />
            )}
          </MapContainer>
        </div>
        {errors.map && <div className="text-danger small mt-1">{errors.map}</div>}
        {hasPinnedFollowUpLocation(value) && (
          <small className="text-muted mt-1 d-block">
            Selected: {value.visitLatitude.toFixed(4)}, {value.visitLongitude.toFixed(4)}
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
