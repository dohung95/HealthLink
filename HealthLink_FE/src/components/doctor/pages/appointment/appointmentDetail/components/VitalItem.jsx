import React from 'react';

const VitalItem = ({ label, value, unit, icon, muted = false }) => (
  <div className={`doctor-vital-item ${muted ? 'doctor-vital-item--muted' : ''}`}>
    <div className="doctor-vital-item__icon">
      <i className={`bi ${icon}`}></i>
    </div>

    <div>
      <div className="doctor-vital-item__label">{label}</div>
      <div className="doctor-vital-item__value">
        {value || 'N/A'}
        {value && unit ? <span> {unit}</span> : null}
      </div>
    </div>
  </div>
);

export default VitalItem;
