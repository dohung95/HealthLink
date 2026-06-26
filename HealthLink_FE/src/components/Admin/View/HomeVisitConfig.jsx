import React, { useState, useEffect } from 'react';
import NavbarAdmin from './NavbarAdmin';
import { scheduleApi } from '../../../api/adminApi';
import Toast from './Toast';
import useToast from '../useToast';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '../Css/Admin.css';

export default function HomeVisitConfig() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [defaultFee, setDefaultFee] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    try {
      setLoading(true);
      const data = await scheduleApi.getHomeVisitConfig();
      setDefaultFee(String(data.defaultFee ?? ''));
    } catch {
      showToast('error', 'Failed to load home visit configuration.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="d-flex">
        <NavbarAdmin onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className={`container-fluid admin-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <div className="text-center py-5">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex">
      <NavbarAdmin onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div className={`container-fluid admin-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="admin-page-header">
          <h2><i className="bi bi-house-heart me-2"></i>Home Visit Config</h2>
          <p className="text-muted">Configure home visit service fees and settings.</p>
        </div>

        <div className="card mt-4">
          <div className="card-body">
            <div className="mb-3">
              <label className="form-label fw-bold">Default Fee (USD)</label>
              <div className="input-group" style={{ maxWidth: '300px' }}>
                <span className="input-group-text">$</span>
                <input
                  type="text"
                  className="form-control"
                  value={defaultFee}
                  readOnly
                />
              </div>
              <div className="form-text">Flat fee charged for each home visit booking. Configure via <code>homevisit.default-fee</code> in application.properties.</div>
            </div>
          </div>
        </div>
      </div>

      {toast.visible && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </div>
  );
}
