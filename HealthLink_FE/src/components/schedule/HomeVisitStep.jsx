import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMapEvents, useMap } from 'react-leaflet';
import { toast } from 'sonner';
import { homeVisitApi } from '../../api/homeVisitApi';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const LocationPicker = ({ location, onPick }) => {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });

  if (!location?.lat || !location?.lng) return null;

  return <Marker position={[location.lat, location.lng]} />;
};

const MapRecenter = ({ location }) => {
  const map = useMap();

  useEffect(() => {
    if (location?.lat && location?.lng) {
      map.setView([location.lat, location.lng], 16);
    }
  }, [location, map]);

  return null;
};

const HomeVisitStep = ({
  homeVisitInfo,
  setHomeVisitInfo,
  patientProfile,
  selectedDoctorId,
  onBack,
  onNext,
}) => {
  const fileRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [estimate, setEstimate] = useState(null);
  const [estimating, setEstimating] = useState(false);

  const formatUsd = (value) =>
    Number(value || 0).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });

  const selectedLocation =
    homeVisitInfo.visitLatitude && homeVisitInfo.visitLongitude
      ? {
        lat: homeVisitInfo.visitLatitude,
        lng: homeVisitInfo.visitLongitude,
      }
      : null;

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return '';

    const birthDate = new Date(dateOfBirth);
    if (Number.isNaN(birthDate.getTime())) return '';

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();

    const hasNotHadBirthdayThisYear =
      today.getMonth() < birthDate.getMonth() ||
      (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate());

    if (hasNotHadBirthdayThisYear) {
      age -= 1;
    }

    return age > 0 ? age : '';
  };

  const buildSelfVisitInfo = () => {
    if (!patientProfile) {
      return {};
    }

    const phone =
      patientProfile.phoneNumber ||
      patientProfile.phone ||
      patientProfile.user?.phoneNumber ||
      '';

    return {
      receiverName: patientProfile.fullName || patientProfile.name || '',
      receiverAge: calculateAge(patientProfile.dateOfBirth),
      receiverGender: patientProfile.gender || '',
      receiverRelationship: 'Self',
      receiverPhone: phone,
      contactPhone: phone,
      visitAddress: patientProfile.address || '',
      visitCity: patientProfile.city || patientProfile.province || '',
    };
  };

  const updateField = (field, value) => {
    setHomeVisitInfo((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetVisitEstimateFields = () => ({
    distanceKm: null,
    estimatedTravelMinutes: null,
    homeVisitFee: null,
    travelFee: null,
    totalFee: null,
    serviceable: null,
    serviceMessage: null,
  });

  const handleSelectForSelf = () => {
    const selfInfo = buildSelfVisitInfo();

    setHomeVisitInfo((prev) => ({
      ...prev,
      ...selfInfo,
      isForSelf: true,
    }));
  };

  const handleSelectForSomeoneElse = () => {
    setHomeVisitInfo((prev) => ({
      ...prev,
      isForSelf: false,
      receiverName: '',
      receiverAge: '',
      receiverGender: '',
      receiverRelationship: '',
      receiverPhone: '',
    }));
  };

  useEffect(() => {
    if (!homeVisitInfo.isForSelf) return;
    if (!patientProfile) return;

    setHomeVisitInfo((prev) => ({
      ...prev,
      ...buildSelfVisitInfo(),
      isForSelf: true,
    }));
  }, [patientProfile, homeVisitInfo.isForSelf]);

  const handleScanFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    try {
      setScanning(true);
      toast.info('Scanning document...');

      const result = await homeVisitApi.scanInfo(file);

      if (!result.success) {
        toast.warning(result.errorMessage || 'Can not scan this document. Please fill manually.');
        return;
      }

      setHomeVisitInfo((prev) => ({
        ...prev,
        receiverName: result.receiverName || prev.receiverName,
        receiverAge: result.receiverAge || prev.receiverAge,
        receiverGender: result.receiverGender || prev.receiverGender,
        receiverPhone: result.receiverPhone || prev.receiverPhone,
        receiverRelationship: result.receiverRelationship || prev.receiverRelationship,
        visitAddress: result.visitAddress || prev.visitAddress,
        visitCity: result.visitCity || prev.visitCity,
      }));

      toast.success('Information scanned. Please verify before continuing.');

      if (result.warnings?.length > 0) {
        toast.warning(result.warnings.join(', '));
      }
    } catch (error) {
      console.error('Home visit scan error:', error);
      toast.error(error.response?.data?.message || 'Can not scan document.');
    } finally {
      setScanning(false);
    }
  };

  const handlePickLocation = (lat, lng) => {
    setHomeVisitInfo((prev) => ({
      ...prev,
      ...resetVisitEstimateFields(),
      visitLatitude: lat,
      visitLongitude: lng,
      distanceKm: null,
      estimatedTravelMinutes: null,
      homeVisitFee: null,
      travelFee: null,
      totalFee: null,
      serviceable: null,
    }));

    setEstimate(null);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.warning('Your browser does not support location detection.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        handlePickLocation(position.coords.latitude, position.coords.longitude);
        toast.success('Current location selected.');
      },
      () => {
        toast.error('Unable to access your location.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  const handleEstimateFee = async () => {
    if (!homeVisitInfo.visitLatitude || !homeVisitInfo.visitLongitude) {
      toast.warning('Please select the visit location first.');
      return;
    }

    try {
      setEstimating(true);

      const result = await homeVisitApi.estimateFee({
        doctorId: selectedDoctorId,
        visitLatitude: homeVisitInfo.visitLatitude,
        visitLongitude: homeVisitInfo.visitLongitude,
      });

      setEstimate(result);


      setHomeVisitInfo((prev) => ({
        ...prev,
        distanceKm: result.distanceKm,
        estimatedTravelMinutes: result.estimatedTravelMinutes,
        homeVisitFee: result.homeVisitFee,
        travelFee: result.travelFee,
        totalFee: result.totalFee,
        serviceable: result.serviceable,
        serviceMessage: result.message,
      }));

      if (result.serviceable) {
        toast.success('Travel fee estimated.');
      } else {
        toast.warning(result.message || 'This address is outside our service area.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Cannot estimate travel fee.');
    } finally {
      setEstimating(false);
    }
  };

  const handleNext = () => {
    if (!homeVisitInfo.visitAddress?.trim()) {
      toast.warning('Visit address is required.');
      return;
    }

    if (!homeVisitInfo.contactPhone?.trim()) {
      toast.warning('Contact phone is required.');
      return;
    }

    if (!homeVisitInfo.reasonForHomeVisit?.trim()) {
      toast.warning('Reason for home visit is required.');
      return;
    }

    if (homeVisitInfo.isForSelf === false) {
      if (!homeVisitInfo.receiverName?.trim()) {
        toast.warning('Receiver name is required.');
        return;
      }

      if (!homeVisitInfo.receiverRelationship?.trim()) {
        toast.warning('Receiver relationship is required.');
        return;
      }

      if (!homeVisitInfo.receiverAge || Number(homeVisitInfo.receiverAge) <= 0) {
        toast.warning('Receiver age must be greater than 0.');
        return;
      }
    }

    if (!homeVisitInfo.visitLatitude || !homeVisitInfo.visitLongitude) {
      toast.warning('Please select the visit location on the map.');
      return;
    }

    if (!estimate) {
      toast.warning('Please estimate the travel fee before continuing.');
      return;
    }

    if (!estimate.serviceable) {
      toast.warning('This address is outside our home visit service area.');
      return;

    }

    onNext();
  };

  return (
    <div className="schedule-card home-visit-card">
      <h2>Home visit information</h2>
      <p className="schedule-card-subtitle">
        Tell us who will receive care and where the doctor should visit.
      </p>

      <div className="home-visit-toggle">
        <button
          type="button"
          className={homeVisitInfo.isForSelf ? 'selected' : ''}
          onClick={handleSelectForSelf}
        >
          For myself
        </button>

        <button
          type="button"
          className={homeVisitInfo.isForSelf === false ? 'selected' : ''}
          onClick={handleSelectForSomeoneElse}
        >
          For someone else
        </button>
      </div>

      {homeVisitInfo.isForSelf && (
        <div className="self-visit-summary">
          <div>
            <strong>Patient</strong>
            <span>{homeVisitInfo.receiverName || 'Not available'}</span>
          </div>

          <div>
            <strong>Age</strong>
            <span>{homeVisitInfo.receiverAge || 'Not available'}</span>
          </div>

          <div>
            <strong>Gender</strong>
            <span>{homeVisitInfo.receiverGender || 'Not available'}</span>
          </div>

          <div>
            <strong>Phone</strong>
            <span>{homeVisitInfo.receiverPhone || homeVisitInfo.contactPhone || 'Not available'}</span>
          </div>
        </div>
      )}

      {homeVisitInfo.isForSelf === false && (
        <>
          <div className="scan-box">
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf,.docx"
              onChange={handleScanFile}
              style={{ display: 'none' }}
            />

            <button
              type="button"
              className="btn-outline-soft"
              onClick={() => fileRef.current?.click()}
              disabled={scanning}
            >
              <i className="bi bi-magic"></i>
              {scanning ? ' Scanning...' : ' Scan from document'}
            </button>

            <small>
              Upload an ID card, insurance card, or document to auto-fill receiver information.
            </small>
          </div>

          <div className="home-visit-grid">
            <label>
              Receiver name <span>*</span>
              <input
                value={homeVisitInfo.receiverName || ''}
                onChange={(e) => updateField('receiverName', e.target.value)}
                placeholder="Full name"
              />
            </label>

            <label>
              Age <span>*</span>
              <input
                type="number"
                min="1"
                value={homeVisitInfo.receiverAge || ''}
                onChange={(e) => updateField('receiverAge', e.target.value)}
                placeholder="Age"
              />
            </label>

            <label>
              Gender
              <select
                value={homeVisitInfo.receiverGender || ''}
                onChange={(e) => updateField('receiverGender', e.target.value)}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label>
              Relationship <span>*</span>
              <input
                value={homeVisitInfo.receiverRelationship || ''}
                onChange={(e) => updateField('receiverRelationship', e.target.value)}
                placeholder="Father, Mother, Child..."
              />
            </label>

            <label>
              Receiver phone
              <input
                value={homeVisitInfo.receiverPhone || ''}
                onChange={(e) => updateField('receiverPhone', e.target.value)}
                placeholder="Optional"
              />
            </label>
          </div>
        </>
      )}

      <div className="home-visit-grid">
        <label className="home-visit-full">
          Visit address <span>*</span>

          <input
            value={homeVisitInfo.visitAddress || ''}
            onChange={(e) => {
              setHomeVisitInfo((prev) => ({
                ...prev,
                ...resetVisitEstimateFields(),
                visitAddress: e.target.value,
              }));
              setEstimate(null);
            }}
            placeholder="House number, street, ward, district..."
          />

          <small className="field-help-text">
            Enter the full address for the doctor, then click the map to pin the exact home entrance.
          </small>
        </label>

        <div className="home-visit-full">
          <div className="map-actions">
            <button
              type="button"
              className="btn-outline-soft"
              onClick={handleUseCurrentLocation}
            >
              Use my current location
            </button>

            <button
              type="button"
              className="btn-outline-soft"
              onClick={handleEstimateFee}
              disabled={estimating}
            >
              {estimating ? 'Estimating...' : 'Estimate travel fee'}
            </button>
          </div>

          <div className="home-visit-map">
            <MapContainer
              center={[
                homeVisitInfo.visitLatitude || 10.7769,
                homeVisitInfo.visitLongitude || 106.7009,
              ]}
              zoom={13}
              style={{ height: '300px', width: '100%' }}
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapRecenter location={selectedLocation} />

              <LocationPicker
                location={selectedLocation}
                onPick={handlePickLocation}
              />
            </MapContainer>
          </div>

          <small className="map-help-text">
            Click on the map to select the exact home entrance, or use your current location. The travel fee will be calculated from this pin.
          </small>

          {estimate && (
            <div className={`home-visit-estimate ${estimate.serviceable ? 'ok' : 'blocked'}`}>
              <div className="home-visit-estimate-item">
                <strong>Distance</strong>
                <span>{estimate.distanceKm} km</span>
              </div>

              <div className="home-visit-estimate-item">
                <strong>Travel time</strong>
                <span>{estimate.estimatedTravelMinutes} min</span>
              </div>

              <div className="home-visit-estimate-item">
                <strong>Base fee</strong>
                <span>{formatUsd(estimate.homeVisitFee)}</span>
              </div>

              <div className="home-visit-estimate-item">
                <strong>Extra distance fee</strong>
                <span>{formatUsd(estimate.travelFee)}</span>
              </div>

              <div className="home-visit-estimate-item total">
                <strong>Total travel fee</strong>
                <span>{formatUsd(estimate.totalFee)}</span>
              </div>

              <p>{estimate.message}</p>
            </div>
          )}
        </div>

        <label>
          City / Province
          <input
            value={homeVisitInfo.visitCity || ''}
            onChange={(e) => updateField('visitCity', e.target.value)}
            placeholder="City or province"
          />
        </label>

        <label>
          Contact phone <span>*</span>
          <input
            value={homeVisitInfo.contactPhone || ''}
            onChange={(e) => updateField('contactPhone', e.target.value)}
            placeholder="Phone number for doctor contact"
          />
        </label>

        <label className="home-visit-full">
          Reason for home visit <span>*</span>
          <textarea
            rows={3}
            value={homeVisitInfo.reasonForHomeVisit || ''}
            onChange={(e) => updateField('reasonForHomeVisit', e.target.value)}
            placeholder="Example: elderly patient has difficulty walking..."
          />
        </label>

        <label className="home-visit-full">
          Special notes
          <textarea
            rows={2}
            value={homeVisitInfo.specialNotes || ''}
            onChange={(e) => updateField('specialNotes', e.target.value)}
            placeholder="Gate code, floor number, mobility issues..."
          />
        </label>
      </div>

      <div className="documents-note">
        Please verify scanned information carefully before payment.
      </div>

      <div className="schedule-actions">
        <button type="button" className="btn-outline-soft" onClick={onBack}>
          Back
        </button>

        <button type="button" className="btn-primary-soft" onClick={handleNext}>
          Next
        </button>
      </div>
    </div>
  );
};

export default HomeVisitStep;