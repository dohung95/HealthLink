import React from 'react';

const DoctorErrorState = ({ message, onRetry }) => {
  return (
    <div className="doctor-empty-state" style={{ borderColor: 'var(--doctor-error)', borderStyle: 'solid' }}>
      <div
        className="doctor-empty-state__icon"
        style={{ background: 'rgba(220, 38, 38, 0.1)', color: 'var(--doctor-error)' }}
      >
        <span className="material-symbols-outlined">error</span>
      </div>
      <h3 className="doctor-empty-state__title" style={{ color: 'var(--doctor-error)' }}>
        {message || 'Something went wrong'}
      </h3>
      <p className="doctor-empty-state__desc">
        Please try again. If the problem persists, contact support.
      </p>
      {onRetry && (
        <button
          className="btn btn-outline-primary btn-sm mt-2"
          onClick={onRetry}
          type="button"
          style={{ borderRadius: 'var(--doctor-radius-md)', fontWeight: 600 }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '0.875rem', marginRight: '0.375rem' }}>
            refresh
          </span>
          Try again
        </button>
      )}
    </div>
  );
};

export default DoctorErrorState;
