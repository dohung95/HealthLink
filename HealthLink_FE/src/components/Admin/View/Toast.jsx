import React, { useEffect } from 'react';
import '../Css/Toast.css';

const Toast = ({ show, onClose, title, message, type = 'success', duration = 3000 }) => {
  useEffect(() => {
    if (show && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  if (!show) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return 'bi-check-circle-fill';
      case 'error':
        return 'bi-exclamation-circle-fill';
      case 'warning':
        return 'bi-exclamation-triangle-fill';
      case 'info':
        return 'bi-info-circle-fill';
      default:
        return 'bi-check-circle-fill';
    }
  };

  const getTypeClass = () => {
    switch (type) {
      case 'success':
        return 'toast-success';
      case 'error':
        return 'toast-error';
      case 'warning':
        return 'toast-warning';
      case 'info':
        return 'toast-info';
      default:
        return 'toast-success';
    }
  };

  return (
    <div className={`admin-toast ${getTypeClass()} ${show ? 'show' : ''}`}>
      <div className="toast-header">
        <i className={`bi ${getIcon()} me-2`}></i>
        <strong className="me-auto">{title}</strong>
        <button
          type="button"
          className="btn-close"
          onClick={onClose}
          aria-label="Close"
        ></button>
      </div>
      {message && (
        <div className="toast-body">
          {message}
        </div>
      )}
    </div>
  );
};

export default Toast;
