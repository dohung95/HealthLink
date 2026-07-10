import React, { useState, useEffect } from "react";
import NavbarAdmin from "./NavbarAdmin";
import { pharmaciesApi } from "../../../api/adminApi";
import Toast from "./Toast";
import useToast from "../useToast";
import { getAvatarUrl } from "../../../utils/avatarHelper";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../Css/Admin.css";

export default function PharmacyManagement() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast, showToast, hideToast } = useToast();

  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('pharmacyViewMode') || 'grid';
  });

  const [pagination, setPagination] = useState({
    pageNumber: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0
  });

  const [filters, setFilters] = useState({
    searchTerm: '',
    status: '',
    verified: '',
    sortBy: 'newest'
  });

  const [selectedPharmacy, setSelectedPharmacy] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [showActionLoading, setShowActionLoading] = useState(false);

  const getPharmacyId = (pharmacy) => pharmacy.id ?? pharmacy.pharmacyId ?? pharmacy.pharmacyID ?? pharmacy._id;

  const fetchPharmacies = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await pharmaciesApi.getAll({
        pageNumber: pagination.pageNumber,
        pageSize: pagination.pageSize,
        searchTerm: filters.searchTerm,
        status: filters.status,
        verified: filters.verified,
        sortBy: filters.sortBy
      });

      const items = response.pharmacies ?? response.content ?? response.data ?? [];
      const pageNumber = response.pageNumber ?? pagination.pageNumber;
      const pageSize = response.pageSize ?? pagination.pageSize;
      const totalCount = response.totalCount ?? response.totalElements ?? items.length;
      const totalPages = response.totalPages ?? Math.ceil(totalCount / pageSize);

      setPharmacies(items);
      setPagination({ pageNumber, pageSize, totalCount, totalPages });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch pharmacies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPharmacies();
  }, [pagination.pageNumber, filters]);

  const handleSearch = (e) => {
    setFilters({ ...filters, searchTerm: e.target.value });
    setPagination({ ...pagination, pageNumber: 1 });
  };

  const handleStatusFilter = (e) => {
    setFilters({ ...filters, status: e.target.value });
    setPagination({ ...pagination, pageNumber: 1 });
  };

  const handleVerifiedFilter = (e) => {
    setFilters({ ...filters, verified: e.target.value });
    setPagination({ ...pagination, pageNumber: 1 });
  };

  const handleSort = (e) => {
    setFilters({ ...filters, sortBy: e.target.value });
    setPagination({ ...pagination, pageNumber: 1 });
  };

  const handlePageChange = (newPage) => {
    setPagination({ ...pagination, pageNumber: newPage });
  };

  const toggleViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem('pharmacyViewMode', mode);
  };

  const handleViewPharmacy = (pharmacy) => {
    setSelectedPharmacy(pharmacy);
    setShowViewModal(true);
  };

  const handleChangeStatus = (pharmacy) => {
    setSelectedPharmacy(pharmacy);
    setNewStatus(pharmacy.status || 'ACTIVE');
    setStatusReason('');
    setShowStatusModal(true);
  };

  const handleUpdateStatus = async () => {
    const id = getPharmacyId(selectedPharmacy);
    if (!id) {
      showToast({ title: 'Update Failed', message: 'Unable to determine pharmacy ID', type: 'error' });
      return;
    }
    if (!statusReason.trim()) {
      showToast({ title: 'Validation Error', message: 'Please provide a reason for status change', type: 'error' });
      return;
    }

    try {
      setShowActionLoading(true);
      await pharmaciesApi.updateStatus(id, newStatus, statusReason);
      setPharmacies((prev) => prev.map((item) =>
        getPharmacyId(item) === id ? { ...item, status: newStatus } : item
      ));
      setShowStatusModal(false);
      showToast({ title: 'Status Updated', message: 'Pharmacy status has been updated successfully', type: 'success' });
    } catch (err) {
      showToast({ title: 'Update Failed', message: err.response?.data?.error || err.message || 'Unable to update status', type: 'error', duration: 5000 });
    } finally {
      setShowActionLoading(false);
    }
  };

  const handleToggleVerification = async (pharmacy) => {
    const id = getPharmacyId(pharmacy);
    if (!id) {
      showToast({ title: 'Update Failed', message: 'Unable to determine pharmacy ID', type: 'error' });
      return;
    }

    const nextVerified = !Boolean(pharmacy.verified);
    const original = pharmacy.verified;
    setPharmacies(prev => prev.map(p =>
      getPharmacyId(p) === id ? { ...p, verified: nextVerified } : p
    ));
    try {
      setShowActionLoading(true);
      await pharmaciesApi.updateVerification(id, nextVerified);
      showToast({ title: 'Verification Updated', message: `Pharmacy verification set to ${nextVerified ? 'Verified' : 'Pending'}`, type: 'success' });
    } catch (err) {
      setPharmacies(prev => prev.map(p =>
        getPharmacyId(p) === id ? { ...p, verified: original } : p
      ));
      showToast({ title: 'Update Failed', message: err.response?.data?.error || err.message || 'Unable to update verification', type: 'error', duration: 5000 });
    } finally {
      setShowActionLoading(false);
    }
  };

  const formatCurrency = (value) => {
    if (value == null || value === '') return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value));
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-success';
      case 'inactive': return 'bg-secondary';
      case 'suspended': return 'bg-warning';
      case 'banned': return 'bg-danger';
      default: return 'bg-secondary';
    }
  };

  const getAvatarGradient = (name) => {
    const charCode = (name || 'P').charCodeAt(0);
    const gradientNumber = (charCode % 10) + 1;
    return `avatar-gradient-${gradientNumber}`;
  };

  return (
    <NavbarAdmin sidebarCollapsed={sidebarCollapsed} onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}>
      <main className="admin-content p-4">
        {/* Page Header */}
        <div className="admin-page-header-doctors mb-4">
          <div className="d-flex justify-content-between align-items-start">
            <div className="admin-page-title-section">
              <div className="d-flex align-items-center gap-3 mb-2">
                <div className="admin-page-icon-doctors" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                  <i className="bi bi-capsule-pill"></i>
                </div>
                <div>
                  <h2 className="admin-page-title mb-1">Pharmacy Management</h2>
                  <div className="d-flex align-items-center gap-2">
                    <span className="admin-page-badge-doctors" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#059669' }}>
                      <i className="bi bi-shop me-1"></i>
                      Partner Network
                    </span>
                    <span className="admin-page-count">
                      {pagination.totalCount} {pagination.totalCount === 1 ? 'Pharmacy' : 'Pharmacies'}
                    </span>
                  </div>
                </div>
              </div>
              <p className="admin-page-subtitle-doctors mb-0">
                View, verify, and manage pharmacy partners across the platform
              </p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="alert alert-danger" role="alert">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
          </div>
        )}

        {/* Filter Bar */}
        <div className="admin-filter-bar">
          <div className="filter-search">
            <i className="bi bi-search"></i>
            <input
              type="text"
              className="form-control"
              placeholder="Search pharmacies..."
              value={filters.searchTerm}
              onChange={handleSearch}
            />
          </div>
          <div className="filter-select">
            <select className="form-select" value={filters.status} onChange={handleStatusFilter}>
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
          <div className="filter-select">
            <select className="form-select" value={filters.verified} onChange={handleVerifiedFilter}>
              <option value="">Verification</option>
              <option value="true">Verified</option>
              <option value="false">Pending</option>
            </select>
          </div>
          <div className="filter-select">
            <select className="form-select" value={filters.sortBy} onChange={handleSort}>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
            </select>
          </div>
          <div className="filter-actions">
            {(filters.searchTerm || filters.status || filters.verified) && (
              <button
                className="btn btn-outline-secondary btn-clear-filter"
                onClick={() => {
                  setFilters({ searchTerm: '', status: '', verified: '', sortBy: 'newest' });
                  setPagination({ ...pagination, pageNumber: 1 });
                }}
              >
                <i className="bi bi-x-circle"></i>
                Clear
              </button>
            )}
            <div className="view-toggle-group">
              <button
                className={`btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => toggleViewMode('grid')}
                title="Grid View"
              >
                <i className="bi bi-grid-3x3-gap"></i>
              </button>
              <button
                className={`btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => toggleViewMode('table')}
                title="Table View"
              >
                <i className="bi bi-list"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Grid View */}
        {viewMode === 'grid' ? (
          loading ? (
            <div className="card-grid-container">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card-skeleton">
                  <div className="d-flex gap-3 mb-3">
                    <div className="skeleton-avatar"></div>
                    <div className="flex-1">
                      <div className="skeleton-line mb-2" style={{ width: '60%' }}></div>
                      <div className="skeleton-line" style={{ width: '40%' }}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : pharmacies.length === 0 ? (
            <div className="card-grid-empty">
              <i className="bi bi-shop-window"></i>
              <h4>No pharmacies found</h4>
              <p>Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="card-grid-container">
              {pharmacies.map((pharmacy) => (
                <div key={getPharmacyId(pharmacy)} className="doctor-card" onClick={() => handleViewPharmacy(pharmacy)}>
                  <div className="card-header-section">
                    <div className="card-avatar-container">
                      <div className={`card-avatar ${getAvatarGradient(pharmacy.name)}`}>
                        {getAvatarUrl(pharmacy.avatarUrl) ? (
                          <img src={getAvatarUrl(pharmacy.avatarUrl)} alt={pharmacy.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                        ) : (
                          <i className="bi bi-capsule-pill" style={{ fontSize: '24px' }}></i>
                        )}
                      </div>
                      <div className={`status-indicator-dot ${pharmacy.status?.toLowerCase() === 'active' ? 'status-dot-active' : 'status-dot-inactive'}`}></div>
                    </div>
                    <div className="card-info-section">
                      <h3 className="card-title">{pharmacy.name || 'Untitled'}</h3>
                      <p className="card-subtitle">{pharmacy.licenseNumber || 'No License'}</p>
                    </div>
                  </div>

                  <div className="card-badges">
                    <span className="specialty-badge specialty-general">
                      <i className="bi bi-geo-alt me-1"></i>
                      {pharmacy.city || 'Unknown'}
                    </span>
                    {pharmacy.verified ? (
                      <span className="verified-badge">
                        <i className="bi bi-patch-check-fill"></i> Verified
                      </span>
                    ) : (
                      <div className="verified-badge bg-warning pending">
                        <span className="badge text-dark">
                          <i className="bi bi-clock"></i> Pending
                        </span>
                      </div>

                    )}
                    <span className={`status-badge ${pharmacy.status?.toLowerCase() === 'active' ? 'status-badge-active' : 'status-badge-inactive'}`}>
                      {pharmacy.status || 'Unknown'}
                    </span>
                  </div>

                  <div className="card-details">
                    <div className="card-detail-item">
                      <i className="bi bi-geo-alt"></i>
                      <span>{pharmacy.address || 'No address'}</span>
                    </div>
                    <div className="card-detail-item">
                      <i className="bi bi-envelope"></i>
                      <span>{pharmacy.email || '—'}</span>
                    </div>
                    <div className="card-detail-item">
                      <i className="bi bi-telephone"></i>
                      <span>{pharmacy.phoneNumber || '—'}</span>
                    </div>
                    <div className="card-detail-item">
                      <i className="bi bi-clock"></i>
                      <span>{pharmacy.open24Hours ? '24/7' : `${pharmacy.openTime || '08:00'} - ${pharmacy.closeTime || '22:00'}`}</span>
                    </div>
                    {pharmacy.deliveryAvailable && (
                      <div className="card-detail-item">
                        <i className="bi bi-truck text-success"></i>
                        <span>Delivery Available &middot; {formatCurrency(pharmacy.deliveryFee)}</span>
                      </div>
                    )}
                  </div>

                  <div className="card-footer">
                    <button
                      className="card-action-btn primary"
                      onClick={(e) => { e.stopPropagation(); handleViewPharmacy(pharmacy); }}
                      title="View Details"
                    >
                      <i className="bi bi-eye"></i>
                      View
                    </button>
                    <button
                      className={`card-action-btn ${pharmacy.verified ? '' : 'success'}`}
                      onClick={(e) => { e.stopPropagation(); handleToggleVerification(pharmacy); }}
                      disabled={showActionLoading}
                      title={pharmacy.verified ? 'Unverify' : 'Verify'}
                    >
                      <i className={pharmacy.verified ? 'bi bi-x-lg' : 'bi bi-patch-check'}></i>
                      {pharmacy.verified ? 'Unverify' : 'Verify'}
                    </button>
                    <button
                      className="card-action-btn"
                      onClick={(e) => { e.stopPropagation(); handleChangeStatus(pharmacy); }}
                      title="Change Status"
                    >
                      <i className="bi bi-toggle-on"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Table View */
          <div className="card border-0 shadow-sm">
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center p-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2">Loading pharmacies...</p>
                </div>
              ) : pharmacies.length === 0 ? (
                <div className="admin-empty-state">
                  <i className="bi bi-shop-window"></i>
                  <p className="mt-2">No pharmacies found</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="admin-table table mb-0 align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>Pharmacy</th>
                        <th>Location</th>
                        <th>Contact</th>
                        <th>Hours</th>
                        <th>Status</th>
                        <th>Verification</th>
                        <th className="text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pharmacies.map((pharmacy) => (
                        <tr key={getPharmacyId(pharmacy)}>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className={`rounded-circle d-flex align-items-center justify-content-center me-2 ${getAvatarGradient(pharmacy.name)}`} style={{ width: "40px", height: "40px", overflow: 'hidden', color: 'white' }}>
                                {getAvatarUrl(pharmacy.avatarUrl) ? (
                                  <img src={getAvatarUrl(pharmacy.avatarUrl)} alt={pharmacy.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <i className="bi bi-capsule-pill"></i>
                                )}
                              </div>
                              <div>
                                <div className="fw-semibold">{pharmacy.name || 'Untitled'}</div>
                                <small className="text-muted">{pharmacy.licenseNumber || 'No license'}</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div>{pharmacy.city || '—'}</div>
                            <small className="text-muted">{pharmacy.address || ''}</small>
                          </td>
                          <td>
                            <div><i className="bi bi-envelope me-1 text-muted"></i>{pharmacy.email || '—'}</div>
                            <div><i className="bi bi-telephone me-1 text-muted"></i>{pharmacy.phoneNumber || '—'}</div>
                          </td>
                          <td>
                            {pharmacy.open24Hours ? (
                              <span className="badge bg-success">24/7</span>
                            ) : (
                              <span>{pharmacy.openTime || '08:00'} - {pharmacy.closeTime || '22:00'}</span>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${getStatusBadgeClass(pharmacy.status)}`}>
                              {pharmacy.status || 'Unknown'}
                            </span>
                          </td>
                          <td>
                            {pharmacy.verified ? (
                              <span className="badge bg-success">
                                <i className="bi bi-patch-check-fill me-1"></i>Verified
                              </span>
                            ) : (
                              <span className="badge bg-warning text-dark">
                                <i className="bi bi-clock me-1"></i>Pending
                              </span>
                            )}
                          </td>
                          <td className="text-center">
                            <div className="admin-btn-group">
                              <button className="btn btn-outline-slate btn-sm" title="View Details" onClick={() => handleViewPharmacy(pharmacy)}>
                                <i className="bi bi-eye"></i>
                              </button>
                              <button
                                className={`btn btn-sm ${pharmacy.verified ? 'btn-outline-warning' : 'btn-outline-success'}`}
                                title={pharmacy.verified ? 'Unverify' : 'Verify'}
                                onClick={() => handleToggleVerification(pharmacy)}
                                disabled={showActionLoading}
                              >
                                <i className={pharmacy.verified ? 'bi bi-x-lg' : 'bi bi-patch-check'}></i>
                              </button>
                              <button className="btn btn-outline-info btn-sm" title="Change Status" onClick={() => handleChangeStatus(pharmacy)}>
                                <i className="bi bi-toggle-on"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pagination */}
        {!loading && pharmacies.length > 0 && (
          <div className="card-footer bg-white">
            <div className="d-flex justify-content-between align-items-center">
              <span className="text-muted" style={{ fontSize: '13px' }}>
                Page <strong style={{ color: 'var(--admin-text)' }}>{pagination.pageNumber}</strong> of <strong style={{ color: 'var(--admin-text)' }}>{pagination.totalPages}</strong> • <strong style={{ color: 'var(--admin-text)' }}>{pagination.totalCount}</strong> total pharmacies
              </span>
              <nav>
                <ul className="pagination mb-0">
                  <li className={`page-item ${pagination.pageNumber === 1 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => handlePageChange(pagination.pageNumber - 1)} disabled={pagination.pageNumber === 1}>
                      Previous
                    </button>
                  </li>
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (pagination.totalPages > 5) {
                      if (pagination.pageNumber <= 3) pageNum = i + 1;
                      else if (pagination.pageNumber >= pagination.totalPages - 2) pageNum = pagination.totalPages - 4 + i;
                      else pageNum = pagination.pageNumber - 2 + i;
                    }
                    return (
                      <li key={pageNum} className={`page-item ${pagination.pageNumber === pageNum ? 'active' : ''}`}>
                        <button className="page-link" onClick={() => handlePageChange(pageNum)}>{pageNum}</button>
                      </li>
                    );
                  })}
                  <li className={`page-item ${pagination.pageNumber === pagination.totalPages ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => handlePageChange(pagination.pageNumber + 1)} disabled={pagination.pageNumber === pagination.totalPages}>
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        )}

        {/* View Modal */}
        {showViewModal && selectedPharmacy && (
          <div className="modal show d-block admin-modal-backdrop" tabIndex="-1">
            <div className="modal-dialog modal-lg modal-dialog-scrollable">
              <div className="modal-content" style={{ border: 'none', boxShadow: 'var(--shadow-lg)' }}>
                <div className="modal-header admin-modal-header primary" style={{ borderBottom: 'none', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                  <h5 className="modal-title">
                    <i className="bi bi-capsule-pill me-2"></i>
                    Pharmacy Details
                  </h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowViewModal(false)}></button>
                </div>
                <div className="modal-body admin-modal-body" style={{ backgroundColor: 'var(--admin-bg)', padding: '20px' }}>
                  {/* Header Card */}
                  <div className="admin-card mb-3" style={{
                    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                    color: 'white',
                    padding: '16px 20px'
                  }}>
                    <div className="d-flex align-items-center gap-3">
                      <div style={{
                        width: '64px', height: '64px', borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '24px', border: '2px solid rgba(255, 255, 255, 0.3)'
                      }}>
                        <i className="bi bi-capsule-pill"></i>
                      </div>
                      <div className="flex-grow-1">
                        <h5 className="mb-1" style={{ fontWeight: '700' }}>{selectedPharmacy.name || 'Pharmacy'}</h5>
                        <div style={{ fontSize: '13px', opacity: 0.9 }}>
                          <span><i className="bi bi-upc-scan me-1"></i>{selectedPharmacy.licenseNumber || 'No License'}</span>
                        </div>
                      </div>
                      <div className="d-flex flex-column gap-1 text-end">
                        <span className={`badge ${getStatusBadgeClass(selectedPharmacy.status)}`}>{selectedPharmacy.status || 'Unknown'}</span>
                        {selectedPharmacy.verified && <span className="badge bg-light text-success"><i className="bi bi-patch-check-fill me-1"></i>Verified</span>}
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="admin-card mb-3" style={{ padding: '16px' }}>
                    <h6 style={{ fontSize: '13px', fontWeight: '600', color: '#059669', marginBottom: '12px' }}>
                      <i className="bi bi-geo-alt-fill me-2"></i>Location & Address
                    </h6>
                    <div className="row g-2">
                      <div className="col-12">
                        <div style={{ fontSize: '12px', color: '#64748b' }}>Address</div>
                        <div style={{ fontSize: '14px', fontWeight: '500' }}>{selectedPharmacy.address || 'N/A'}</div>
                      </div>
                      <div className="col-4">
                        <div style={{ fontSize: '12px', color: '#64748b' }}>City</div>
                        <div style={{ fontSize: '14px', fontWeight: '500' }}>{selectedPharmacy.city || 'N/A'}</div>
                      </div>
                      <div className="col-4">
                        <div style={{ fontSize: '12px', color: '#64748b' }}>District</div>
                        <div style={{ fontSize: '14px', fontWeight: '500' }}>{selectedPharmacy.district || 'N/A'}</div>
                      </div>
                      <div className="col-4">
                        <div style={{ fontSize: '12px', color: '#64748b' }}>Ward</div>
                        <div style={{ fontSize: '14px', fontWeight: '500' }}>{selectedPharmacy.ward || 'N/A'}</div>
                      </div>
                      <div className="col-12">
                        <div style={{ fontSize: '12px', color: '#64748b' }}>Location Pin</div>
                        <div style={{ fontSize: '14px', fontWeight: '500' }}>
                          {selectedPharmacy.latitude != null && selectedPharmacy.longitude != null ? (
                            <a
                              href={`https://www.google.com/maps?q=${selectedPharmacy.latitude},${selectedPharmacy.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {selectedPharmacy.latitude.toFixed(6)}, {selectedPharmacy.longitude.toFixed(6)} <i className="bi bi-box-arrow-up-right"></i>
                            </a>
                          ) : (
                            <span className="text-warning fst-italic">
                              <i className="bi bi-exclamation-triangle-fill me-1"></i>Not set — delivery orders will fail
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact & Hours */}
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <div className="admin-card h-100" style={{ padding: '16px' }}>
                        <h6 style={{ fontSize: '13px', fontWeight: '600', color: '#059669', marginBottom: '12px' }}>
                          <i className="bi bi-telephone-fill me-2"></i>Contact
                        </h6>
                        <div className="mb-2">
                          <div style={{ fontSize: '12px', color: '#64748b' }}>Phone</div>
                          <div style={{ fontSize: '14px', fontWeight: '500' }}>{selectedPharmacy.phoneNumber || 'N/A'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>Email</div>
                          <div style={{ fontSize: '14px', fontWeight: '500' }}>{selectedPharmacy.email || 'N/A'}</div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="admin-card h-100" style={{ padding: '16px' }}>
                        <h6 style={{ fontSize: '13px', fontWeight: '600', color: '#059669', marginBottom: '12px' }}>
                          <i className="bi bi-clock-fill me-2"></i>Operating Hours
                        </h6>
                        <div className="mb-2">
                          <div style={{ fontSize: '12px', color: '#64748b' }}>Hours</div>
                          <div style={{ fontSize: '14px', fontWeight: '500' }}>
                            {selectedPharmacy.open24Hours ? '24/7 Open' : `${selectedPharmacy.openTime || '08:00'} - ${selectedPharmacy.closeTime || '22:00'}`}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>Delivery</div>
                          <div style={{ fontSize: '14px', fontWeight: '500' }}>
                            {selectedPharmacy.deliveryAvailable ? `Available (${selectedPharmacy.deliveryRadius || 0} km)` : 'Not Available'}
                          </div>
                        </div>
                        {selectedPharmacy.deliveryAvailable && (
                          <div className="mt-2">
                            <div style={{ fontSize: '12px', color: '#64748b' }}>Delivery Fee</div>
                            <div style={{ fontSize: '14px', fontWeight: '500' }}>
                              {formatCurrency(selectedPharmacy.deliveryFee)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="admin-card" style={{ padding: '16px' }}>
                    <h6 style={{ fontSize: '13px', fontWeight: '600', color: '#059669', marginBottom: '12px' }}>
                      <i className="bi bi-cash-stack me-2"></i>Financial Summary
                    </h6>
                    <div className="row g-3">
                      <div className="col-md-4">
                        <div className="text-center p-2" style={{ background: '#f0fdf4', borderRadius: '8px' }}>
                          <div style={{ fontSize: '18px', fontWeight: '700', color: '#16a34a' }}>
                            {formatCurrency(selectedPharmacy.totalEarnings ?? selectedPharmacy.totalRevenue ?? 0)}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>Total Revenue</div>
                        </div>
                      </div>
                      <div className="col-md-8">
                        <div className="d-flex align-items-center gap-2 p-2" style={{ background: '#f8fafc', borderRadius: '8px', height: '100%' }}>
                          <i className="bi bi-shield-lock" style={{ color: '#94a3b8' }}></i>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>
                            Payment details (bank account) are protected and managed by the pharmacy.
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedPharmacy.description && (
                    <div className="admin-card mt-3" style={{ padding: '16px' }}>
                      <h6 style={{ fontSize: '13px', fontWeight: '600', color: '#059669', marginBottom: '12px' }}>
                        <i className="bi bi-card-text me-2"></i>Description
                      </h6>
                      <p style={{ fontSize: '13px', color: '#475569', marginBottom: 0 }}>{selectedPharmacy.description}</p>
                    </div>
                  )}
                </div>
                <div className="admin-modal-footer">
                  <button type="button" className="admin-btn-modal secondary" onClick={() => setShowViewModal(false)}>
                    <i className="bi bi-x-circle"></i>Close
                  </button>
                  <button
                    type="button"
                    className={`admin-btn-modal ${selectedPharmacy.verified ? 'warning' : 'success'}`}
                    onClick={() => { handleToggleVerification(selectedPharmacy); setShowViewModal(false); }}
                  >
                    <i className={selectedPharmacy.verified ? 'bi bi-x-lg' : 'bi bi-patch-check'}></i>
                    {selectedPharmacy.verified ? 'Unverify' : 'Verify'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status Modal */}
        {showStatusModal && selectedPharmacy && (
          <div className="admin-modal-overlay" onClick={() => setShowStatusModal(false)}>
            <div className="admin-modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
              <div className="admin-modal-content">
                <div className="admin-modal-header primary" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                  <h5><i className="bi bi-shield-check me-2"></i>Update Pharmacy Status</h5>
                  <button type="button" className="admin-modal-close" onClick={() => setShowStatusModal(false)}>
                    <i className="bi bi-x-lg"></i>
                  </button>
                </div>
                <div className="admin-modal-body">
                  <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                    <div className="d-flex align-items-center gap-3">
                      <div className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center" style={{ width: "50px", height: "50px" }}>
                        <i className="bi bi-capsule-pill"></i>
                      </div>
                      <div>
                        <h6 className="mb-1" style={{ fontWeight: '600' }}>{selectedPharmacy.name}</h6>
                        <p className="mb-0" style={{ fontSize: '13px', color: '#64748b' }}>{selectedPharmacy.licenseNumber || 'No License'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="admin-form-label">Current Status</label>
                    <div style={{ padding: '12px 16px', background: 'white', border: '2px dashed #e0f2fe', borderRadius: '8px', display: 'inline-block' }}>
                      <span className={`badge ${getStatusBadgeClass(selectedPharmacy.status)}`} style={{ fontSize: '14px', padding: '8px 16px' }}>
                        {selectedPharmacy.status || 'Unknown'}
                      </span>
                    </div>
                  </div>

                  <div className="text-center mb-4">
                    <i className="bi bi-arrow-down-circle-fill" style={{ fontSize: '24px', color: '#10b981' }}></i>
                  </div>

                  <div className="mb-4">
                    <label className="admin-form-label">Select New Status</label>
                    <select className="form-select admin-form-control" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="SUSPENDED">Suspended</option>
                      <option value="BANNED">Banned</option>
                    </select>
                  </div>

                  {/* Reason Input */}
                  <div className="mb-3">
                    <label className="admin-form-label" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                      <i className="bi bi-chat-left-text" style={{color: '#10b981'}}></i>
                      Reason for Status Change <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className="form-control admin-form-control"
                      value={statusReason}
                      onChange={(e) => setStatusReason(e.target.value)}
                      placeholder="Please provide a reason for this status change..."
                      rows={3}
                      style={{fontSize: '14px', resize: 'none'}}
                    />
                    <small className="text-muted">This reason will be recorded in the audit log.</small>
                  </div>
                </div>
                <div className="admin-modal-footer">
                  <button type="button" className="admin-btn-modal secondary" onClick={() => setShowStatusModal(false)}>
                    <i className="bi bi-x-circle"></i>Cancel
                  </button>
                  <button type="button" className="admin-btn-modal primary" onClick={handleUpdateStatus} disabled={showActionLoading}>
                    <i className="bi bi-check-circle"></i>Confirm Update
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <Toast show={toast.show} onClose={hideToast} title={toast.title} message={toast.message} type={toast.type} duration={toast.duration} />
      </main>
    </NavbarAdmin>
  );
}
