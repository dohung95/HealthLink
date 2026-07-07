import React, { useEffect, useState } from 'react';
import { homeVisitApi } from '../../api/homeVisitApi';

const FollowUpHomeVisitServicesStep = ({ selectedServices, onChange, onBack, onNext }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    homeVisitApi.getServices()
      .then((data) => { if (!cancelled) setServices(data || []); })
      .catch((err) => { if (!cancelled) setError(err.response?.data?.message || 'Could not load services.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const toggleService = (service) => {
    onChange(
      selectedServices.some((item) => item.serviceId === service.serviceId)
        ? selectedServices.filter((item) => item.serviceId !== service.serviceId)
        : [...selectedServices, service],
    );
  };

  const serviceTotal = selectedServices.reduce((sum, s) => sum + Number(s.price || 0), 0);

  return (
    <div className="border rounded-3 p-4 bg-white">
      <h5 className="mb-3"><i className="bi bi-clipboard2-pulse me-2" />Optional Services</h5>
      <p className="text-muted small mb-3">Select any additional services for your HomeVisit follow-up.</p>

      {loading && (
        <div className="placeholder-glow">
          <span className="placeholder col-12 d-block mb-2" style={{ height: 40 }} />
          <span className="placeholder col-12 d-block mb-2" style={{ height: 40 }} />
          <span className="placeholder col-12 d-block" style={{ height: 40 }} />
        </div>
      )}

      {error && (
        <div className="alert alert-warning mb-0" role="alert">
          <i className="bi bi-exclamation-triangle me-2" />{error}
        </div>
      )}

      {!loading && !error && services.length === 0 && (
        <div className="text-muted text-center py-4">
          <i className="bi bi-inbox display-6 d-block mb-2" />
          No additional services available.
        </div>
      )}

      {!loading && services.length > 0 && (
        <div className="d-flex flex-column gap-2">
          {services.map((svc) => {
            const checked = selectedServices.some((item) => item.serviceId === svc.serviceId);
            return (
              <label
                key={svc.serviceId}
                className={`d-flex align-items-center gap-3 p-3 border rounded-3 ${checked ? 'border-primary bg-primary bg-opacity-10' : ''}`}
                style={{ cursor: 'pointer' }}
              >
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={checked}
                  onChange={() => toggleService(svc)}
                  style={{ transform: 'scale(1.2)' }}
                />
                <div className="flex-grow-1">
                  <div className="fw-semibold">{svc.serviceName}</div>
                  {svc.description && <div className="text-muted small">{svc.description}</div>}
                </div>
                <div className="fw-semibold text-nowrap">${Number(svc.price || 0).toFixed(2)}</div>
              </label>
            );
          })}
        </div>
      )}

      {selectedServices.length > 0 && (
        <div className="text-end mt-3">
          <small className="text-muted">Service total: <strong className="text-dark">${serviceTotal.toFixed(2)}</strong></small>
        </div>
      )}

      <div className="d-flex justify-content-between mt-4">
        <button type="button" className="btn btn-outline-secondary" onClick={onBack}>
          <i className="bi bi-arrow-left me-2" />Back
        </button>
        <button type="button" className="btn btn-primary" onClick={onNext}>
          Next <i className="bi bi-arrow-right ms-2" />
        </button>
      </div>
    </div>
  );
};

export default FollowUpHomeVisitServicesStep;
