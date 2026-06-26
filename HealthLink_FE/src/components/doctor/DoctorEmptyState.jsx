import React from 'react';

const DoctorEmptyState = ({ icon, title, description, action }) => {
  return (
    <div className="doctor-empty-state">
      <div className="doctor-empty-state__icon">
        <span className="material-symbols-outlined">{icon || 'inbox'}</span>
      </div>
      <h3 className="doctor-empty-state__title">{title || 'No data found'}</h3>
      {description && <p className="doctor-empty-state__desc">{description}</p>}
      {action && (
        <button
          className="btn btn-primary btn-sm mt-2"
          onClick={action.onClick}
          type="button"
          style={{ borderRadius: 'var(--doctor-radius-md)', fontWeight: 600 }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '0.875rem', marginRight: '0.375rem' }}>
            {action.icon || 'add'}
          </span>
          {action.label}
        </button>
      )}
    </div>
  );
};

export default DoctorEmptyState;
