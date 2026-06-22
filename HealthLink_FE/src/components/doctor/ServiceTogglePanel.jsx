import React, { useState } from 'react';
import { doctorService as doctorApi } from '../../api/doctorApi';

const SERVICE_CONFIG = [
  { key: 'online', label: 'Khám Online', icon: 'public' },
  { key: 'homeVisit', label: 'Bác Sĩ Gia Đình', icon: 'home' },
];

export default function ServiceTogglePanel({ currentServices, onClose }) {
  const [services, setServices] = useState(currentServices || {});
  const [loading, setLoading] = useState({});
  const [error, setError] = useState(null);

  const handleToggle = async (key) => {
    const newValue = !services[key];
    setServices(prev => ({ ...prev, [key]: newValue }));
    setLoading(prev => ({ ...prev, [key]: true }));
    setError(null);

    try {
      const result = await doctorApi.updateServices({ [key]: newValue });
      setServices(result);
    } catch (err) {
      setServices(prev => ({ ...prev, [key]: !newValue }));
      setError(err.response?.data?.message || 'Cập nhật thất bại');
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  return (
    <div className="p-3" style={{ minWidth: 260 }}>
      <div className="d-flex align-items-center justify-content-between mb-2">
        <h6 className="fw-bold mb-0" style={{ color: 'var(--doctor-primary)' }}>
          <span className="material-symbols-outlined me-1" style={{ fontSize: '1.25rem' }}>tune</span>
          Dịch vụ
        </h6>
        <button className="btn btn-sm border-0 bg-transparent p-0" onClick={onClose}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>close</span>
        </button>
      </div>
      {error && (
        <div className="alert alert-danger py-1 px-2 mb-2" style={{ fontSize: '0.8rem' }}>{error}</div>
      )}
      {SERVICE_CONFIG.map(({ key, label, icon }) => (
        <div key={key}
          className="d-flex align-items-center justify-content-between py-2 px-1 rounded"
          style={{ cursor: loading[key] ? 'not-allowed' : 'pointer',
                   borderRadius: '8px' }}
          onClick={() => !loading[key] && handleToggle(key)}
        >
          <div className="d-flex align-items-center gap-2">
            <span className="material-symbols-outlined"
              style={{ fontSize: '1.25rem', color: services[key]
                ? 'var(--doctor-primary)' : 'var(--text-muted)' }}>
              {icon}
            </span>
            <span style={{ fontSize: '0.9rem' }}>{label}</span>
          </div>
          <div className="form-check form-switch mb-0">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              checked={!!services[key]}
              disabled={loading[key]}
              onChange={() => {}}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
