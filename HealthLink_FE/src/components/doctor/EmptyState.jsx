import React from 'react';

const EmptyState = ({ title, description }) => (
  <div className="doctor-detail-empty">
    <div className="doctor-detail-empty__icon">
      <i className="bi bi-inbox"></i>
    </div>
    <h3 className="doctor-detail-empty__title">{title}</h3>
    <p className="doctor-detail-empty__description">{description}</p>
  </div>
);

export default EmptyState;
