import { useEffect, useMemo, useState } from 'react';
import { homeVisitApi } from '../../api/homeVisitApi';

const formatUsd = (value) =>
  Number(value || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

const HomeVisitServicesStep = ({
  selectedServices,
  setSelectedServices,
  onBack,
  onNext,
}) => {
  const [services, setServices] = useState([]);

  useEffect(() => {
    homeVisitApi.getServices().then(setServices);
  }, []);

  const selectedIds = useMemo(
    () => new Set(selectedServices.map((item) => item.serviceId)),
    [selectedServices]
  );

  const toggleService = (service) => {
    if (selectedIds.has(service.serviceId)) {
      setSelectedServices((prev) =>
        prev.filter((item) => item.serviceId !== service.serviceId)
      );
      return;
    }

    setSelectedServices((prev) => [...prev, service]);
  };

  const total = selectedServices.reduce(
    (sum, item) => sum + Number(item.price || 0),
    0
  );

  return (
    <div className="schedule-card home-visit-services-card">
      <h2>Add home visit services</h2>

      <div className="service-list">
        {services.map((service) => (
          <label key={service.serviceId} className="service-option">
            <input
              type="checkbox"
              checked={selectedIds.has(service.serviceId)}
              onChange={() => toggleService(service)}
            />
            <span>
              <strong>{service.serviceName}</strong>
              <small>{service.description}</small>
            </span>
            <b>{formatUsd(service.price)}</b>
          </label>
        ))}
      </div>

      <div className="home-visit-services-total">
        <strong>Selected services total</strong>
        <span>{formatUsd(total)}</span>
      </div>

      <div className="schedule-actions">
        <button type="button" className="btn-outline-soft" onClick={onBack}>Back</button>
        <button type="button" className="btn-primary-soft" onClick={onNext}>Next</button>
      </div>
    </div>
  );
};

export default HomeVisitServicesStep;
