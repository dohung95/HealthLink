import React, { useState, useEffect } from "react";
import NavbarAdmin from "./NavbarAdmin";
import { pharmaciesApi } from "../../../api/adminApi";
import Toast from "./Toast";
import useToast from "../useToast";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../Css/Admin.css";
import "../Css/PharmacyManagement.css";

export default function PharmacyManagement() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast, showToast, hideToast } = useToast();

  const [pagination, setPagination] = useState({
    pageNumber: 1,
    pageSize: 12,
    totalCount: 0,
    totalPages: 0
  });

  const [filters, setFilters] = useState({
    searchTerm: '',
    status: '',
    city: '',
    verified: '',
    sortBy: 'newest'
  });

  const [selectedPharmacy, setSelectedPharmacy] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showActionLoading, setShowActionLoading] = useState(false);

  // View mode state: 'table' or 'grid'
  const [viewMode, setViewMode] = useState('grid');

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    verified: 0,
    pending: 0
  });

  const normalizePharmacyResponse = (response) => {
    const items = response.pharmacies ?? response.content ?? response.data ?? [];
    const pageNumber = response.pageNumber ?? (response.number != null ? response.number + 1 : pagination.pageNumber);
    const pageSize = response.pageSize ?? response.size ?? pagination.pageSize;
    const totalCount = response.totalCount ?? response.totalElements ?? items.length;
    const totalPages = response.totalPages ?? (pageSize > 0 ? Math.ceil(totalCount / pageSize) : 1);
    return { items, pageNumber, pageSize, totalCount, totalPages };
  };

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
        city: filters.city,
        verified: filters.verified,
        sortBy: filters.sortBy
      });

      const { items, pageNumber, pageSize, totalCount, totalPages } = normalizePharmacyResponse(response);
      setPharmacies(items);
      setPagination({ pageNumber, pageSize, totalCount, totalPages });

      // Calculate stats
      const activeCount = items.filter(p => p.status?.toLowerCase() === 'active').length;
      const verifiedCount = items.filter(p => p.verified).length;
      const pendingCount = items.filter(p => !p.verified).length;
      setStats({
        total: totalCount,
        active: activeCount,
        verified: verifiedCount,
        pending: pendingCount
      });
    } catch (err) {
      const errorMsg = err.response?.data?.error
        || err.response?.data?.message
        || err.response?.data?.trace?.substring(0, 200)
        || err.message
        || 'Failed to fetch pharmacies';
      setError(`Error ${err.response?.status || ''}: ${errorMsg}`);
      console.error('Error fetching pharmacies:', err);
      console.error('Response data:', err.response?.data);
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

  const handleFilterChange = (field) => (e) => {
    setFilters({ ...filters, [field]: e.target.value });
    setPagination({ ...pagination, pageNumber: 1 });
  };

  const handleSort = (e) => {
    setFilters({ ...filters, sortBy: e.target.value });
  };

  const handlePageChange = (page) => {
    if (page < 1 || page > pagination.totalPages) return;
    setPagination({ ...pagination, pageNumber: page });
  };

  const handleViewPharmacy = (pharmacy) => {
    setSelectedPharmacy(pharmacy);
    setShowViewModal(true);
  };

  const handleToggleStatus = async (pharmacy) => {
    const id = getPharmacyId(pharmacy);
    if (!id) {
      showToast({ title: 'Update Failed', message: 'Unable to determine pharmacy ID', type: 'error' });
      return;
    }

    const nextStatus = pharmacy.status?.toLowerCase() === 'active' ? 'INACTIVE' : 'ACTIVE';
    try {
      setShowActionLoading(true);
      await pharmaciesApi.updateStatus(id, nextStatus);
      setPharmacies((prev) => prev.map((item) => item === pharmacy ? { ...item, status: nextStatus } : item));
      showToast({ title: 'Status Updated', message: `Pharmacy has been marked ${nextStatus}`, type: 'success' });
    } catch (err) {
      showToast({ title: 'Update Failed', message: err.response?.data?.error || err.message || 'Unable to update status', type: 'error', duration: 5000 });
      console.error(err);
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
    try {
      setShowActionLoading(true);
      await pharmaciesApi.updateVerification(id, nextVerified);
      setPharmacies((prev) => prev.map((item) => item === pharmacy ? { ...item, verified: nextVerified } : item));
      showToast({ title: 'Verification Updated', message: `Pharmacy verification set to ${nextVerified}`, type: 'success' });
    } catch (err) {
      showToast({ title: 'Update Failed', message: err.response?.data?.error || err.message || 'Unable to update verification', type: 'error', duration: 5000 });
      console.error(err);
    } finally {
      setShowActionLoading(false);
    }
  };

  const handleDeletePharmacy = async (pharmacy) => {
    const id = getPharmacyId(pharmacy);
    if (!id) {
      showToast({ title: 'Delete Failed', message: 'Unable to determine pharmacy ID', type: 'error' });
      return;
    }

    if (!window.confirm('Are you sure you want to permanently delete this pharmacy?')) {
      return;
    }

    try {
      setShowActionLoading(true);
      await pharmaciesApi.delete(id);
      setPharmacies((prev) => prev.filter((item) => item !== pharmacy));
      showToast({ title: 'Deleted', message: 'Pharmacy was removed successfully', type: 'success' });
    } catch (err) {
      showToast({ title: 'Delete Failed', message: err.response?.data?.error || err.message || 'Unable to delete pharmacy', type: 'error', duration: 5000 });
      console.error(err);
    } finally {
      setShowActionLoading(false);
    }
  };

  const formatCurrency = (value) => {
    if (value == null || value === '') {
      return 'N/A';
    }
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value));
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      status: '',
      city: '',
      verified: '',
      sortBy: 'newest'
    });
    setPagination({ ...pagination, pageNumber: 1 });
  };

  return (
    <NavbarAdmin sidebarCollapsed={sidebarCollapsed} onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}>
      <main className="admin-content p-4">
        {/* Page Header */}
        <div className="pharmacy-page-header mb-4">
          <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start gap-3">
            <div className="pharmacy-header-left">
              <div className="d-flex align-items-center gap-3 mb-2">
                <div className="pharmacy-page-icon">
                  <i className="bi bi-capsule-pill"></i>
                </div>
                <div>
                  <h2 className="pharmacy-page-title mb-1">Pharmacy Management</h2>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <span className="pharmacy-page-badge">
                      <i className="bi bi-shop me-1"></i>
                      Partner Network
                    </span>
                    <span className="pharmacy-page-count">
                      <i className="bi bi-database me-1"></i>
                      {pagination.totalCount} Total
                    </span>
                  </div>
                </div>
              </div>
              <p className="pharmacy-page-subtitle mb-0">
                View, verify, and manage pharmacy partners across the platform
              </p>
            </div>

            {/* View Toggle */}
            <div className="pharmacy-view-toggle">
              <button
                className={`pharmacy-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                <i className="bi bi-grid-3x3-gap-fill"></i>
                <span>Grid</span>
              </button>
              <button
                className={`pharmacy-view-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
              >
                <i className="bi bi-list-ul"></i>
                <span>Table</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="pharmacy-stats-row mb-4">
          <div className="pharmacy-stat-card stat-total">
            <div className="pharmacy-stat-icon">
              <i className="bi bi-shop"></i>
            </div>
            <div className="pharmacy-stat-content">
              <div className="pharmacy-stat-value">{stats.total}</div>
              <div className="pharmacy-stat-label">Total Pharmacies</div>
            </div>
          </div>
          <div className="pharmacy-stat-card stat-active">
            <div className="pharmacy-stat-icon">
              <i className="bi bi-check-circle-fill"></i>
            </div>
            <div className="pharmacy-stat-content">
              <div className="pharmacy-stat-value">{stats.active}</div>
              <div className="pharmacy-stat-label">Active</div>
            </div>
          </div>
          <div className="pharmacy-stat-card stat-verified">
            <div className="pharmacy-stat-icon">
              <i className="bi bi-patch-check-fill"></i>
            </div>
            <div className="pharmacy-stat-content">
              <div className="pharmacy-stat-value">{stats.verified}</div>
              <div className="pharmacy-stat-label">Verified</div>
            </div>
          </div>
          <div className="pharmacy-stat-card stat-pending">
            <div className="pharmacy-stat-icon">
              <i className="bi bi-clock-history"></i>
            </div>
            <div className="pharmacy-stat-content">
              <div className="pharmacy-stat-value">{stats.pending}</div>
              <div className="pharmacy-stat-label">Pending Verification</div>
            </div>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger d-flex align-items-center mb-4" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            <div>{error}</div>
          </div>
        )}

        {/* Filter Bar */}
        <div className="pharmacy-filter-card mb-4">
          <div className="pharmacy-filter-header">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-funnel-fill"></i>
              <span>Search & Filters</span>
            </div>
            <button className="pharmacy-clear-btn" onClick={clearFilters}>
              <i className="bi bi-x-circle me-1"></i>
              Clear All
            </button>
          </div>
          <div className="pharmacy-filter-body">
            <div className="pharmacy-filter-group">
              <div className="pharmacy-search-input">
                <i className="bi bi-search"></i>
                <input
                  type="text"
                  placeholder="Search by name, license, email..."
                  value={filters.searchTerm}
                  onChange={handleSearch}
                />
              </div>
            </div>
            <div className="pharmacy-filter-group">
              <select value={filters.status} onChange={handleFilterChange('status')}>
                <option value="">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
            <div className="pharmacy-filter-group">
              <select value={filters.verified} onChange={handleFilterChange('verified')}>
                <option value="">Verification</option>
                <option value="true">Verified</option>
                <option value="false">Not Verified</option>
              </select>
            </div>
            <div className="pharmacy-filter-group">
              <input
                type="text"
                placeholder="Filter by city..."
                value={filters.city}
                onChange={handleFilterChange('city')}
              />
            </div>
            <div className="pharmacy-filter-group">
              <select value={filters.sortBy} onChange={handleSort}>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="active">Active First</option>
                <option value="verified">Verified First</option>
              </select>
            </div>
          </div>
        </div>

        {/* Grid View */}
        {viewMode === 'grid' && (
          <div className="pharmacy-grid-container">
            {loading ? (
              // Skeleton Loading
              <div className="pharmacy-grid">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="pharmacy-skeleton-card">
                    <div className="skeleton-bar"></div>
                    <div className="skeleton-header">
                      <div className="skeleton-icon"></div>
                      <div className="skeleton-info">
                        <div className="skeleton-title"></div>
                        <div className="skeleton-subtitle"></div>
                      </div>
                    </div>
                    <div className="skeleton-body">
                      <div className="skeleton-line long"></div>
                      <div className="skeleton-line medium"></div>
                      <div className="skeleton-line short"></div>
                    </div>
                    <div className="skeleton-footer">
                      <div className="skeleton-btn"></div>
                      <div className="skeleton-btn"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : pharmacies.length === 0 ? (
              <div className="pharmacy-empty-state">
                <div className="pharmacy-empty-icon">
                  <i className="bi bi-shop-window"></i>
                </div>
                <h4>No Pharmacies Found</h4>
                <p>There are no pharmacies matching your search criteria.</p>
                <button className="pharmacy-empty-btn" onClick={clearFilters}>
                  <i className="bi bi-arrow-counterclockwise me-2"></i>
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="pharmacy-grid">
                {pharmacies.map((pharmacy) => (
                  <div
                    key={getPharmacyId(pharmacy) || pharmacy.name || pharmacy.email}
                    className={`pharmacy-card-v2 ${pharmacy.status?.toLowerCase() === 'active' ? 'active' : 'inactive'}`}
                  >
                    {/* Status Bar */}
                    <div className={`pharmacy-card-bar ${pharmacy.status?.toLowerCase() === 'active' ? 'active' : 'inactive'}`}></div>

                    {/* Card Header */}
                    <div className="pharmacy-card-header-v2">
                      <div className="pharmacy-avatar">
                        <i className="bi bi-capsule-pill"></i>
                      </div>
                      <div className="pharmacy-info">
                        <h4 className="pharmacy-name-v2">{pharmacy.name || pharmacy.Name || 'Untitled'}</h4>
                        <div className="pharmacy-license-v2">
                          <i className="bi bi-upc-scan"></i>
                          {pharmacy.licenseNumber || pharmacy.LicenseNumber || 'No License'}
                        </div>
                      </div>
                      <div className="pharmacy-badges-v2">
                        {pharmacy.verified ? (
                          <span className="pharmacy-badge verified">
                            <i className="bi bi-patch-check-fill"></i>
                          </span>
                        ) : (
                          <span className="pharmacy-badge pending">
                            <i className="bi bi-clock"></i>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="pharmacy-card-body-v2">
                      <div className="pharmacy-detail">
                        <i className="bi bi-geo-alt-fill"></i>
                        <span>{pharmacy.address || pharmacy.Address || 'No address provided'}</span>
                      </div>
                      <div className="pharmacy-detail">
                        <i className="bi bi-building"></i>
                        <span>{pharmacy.city || pharmacy.City || '—'}, {pharmacy.district || pharmacy.District || ''}</span>
                      </div>
                      <div className="pharmacy-detail">
                        <i className="bi bi-envelope-fill"></i>
                        <span>{pharmacy.email || pharmacy.Email || '—'}</span>
                      </div>
                      <div className="pharmacy-detail">
                        <i className="bi bi-telephone-fill"></i>
                        <span>{pharmacy.phoneNumber || pharmacy.PhoneNumber || '—'}</span>
                      </div>
                    </div>

                    {/* Card Meta */}
                    <div className="pharmacy-card-meta">
                      <div className="pharmacy-meta-item">
                        <i className="bi bi-clock-fill"></i>
                        <span>{pharmacy.open24Hours ? '24/7' : `${pharmacy.openTime || '08:00'} - ${pharmacy.closeTime || '22:00'}`}</span>
                      </div>
                      {(pharmacy.deliveryAvailable || pharmacy.DeliveryAvailable) && (
                        <div className="pharmacy-meta-item delivery">
                          <i className="bi bi-truck"></i>
                          <span>Delivery</span>
                        </div>
                      )}
                      <div className="pharmacy-meta-item revenue">
                        <i className="bi bi-cash-stack"></i>
                        <span>{formatCurrency(pharmacy.totalEarnings ?? pharmacy.totalRevenue ?? 0)}</span>
                      </div>
                    </div>

                    {/* Card Status */}
                    <div className="pharmacy-card-status">
                      <span className={`status-badge ${pharmacy.status?.toLowerCase() === 'active' ? 'active' : 'inactive'}`}>
                        <span className="status-dot"></span>
                        {pharmacy.status || 'Unknown'}
                      </span>
                      <span className={`verification-badge ${pharmacy.verified ? 'verified' : 'pending'}`}>
                        {pharmacy.verified ? 'Verified' : 'Pending'}
                      </span>
                    </div>

                    {/* Card Actions */}
                    <div className="pharmacy-card-actions-v2">
                      <button className="pharmacy-btn view" onClick={() => handleViewPharmacy(pharmacy)}>
                        <i className="bi bi-eye-fill"></i>
                        <span>Details</span>
                      </button>
                      <button
                        className={`pharmacy-btn ${pharmacy.verified ? 'unverify' : 'verify'}`}
                        onClick={() => handleToggleVerification(pharmacy)}
                        disabled={showActionLoading}
                      >
                        <i className={pharmacy.verified ? 'bi bi-x-lg' : 'bi bi-patch-check'}></i>
                        <span>{pharmacy.verified ? 'Unverify' : 'Verify'}</span>
                      </button>
                      <button
                        className={`pharmacy-btn ${pharmacy.status?.toLowerCase() === 'active' ? 'disable' : 'enable'}`}
                        onClick={() => handleToggleStatus(pharmacy)}
                        disabled={showActionLoading}
                      >
                        <i className={pharmacy.status?.toLowerCase() === 'active' ? 'bi bi-pause-fill' : 'bi bi-play-fill'}></i>
                      </button>
                      <button
                        className="pharmacy-btn delete"
                        onClick={() => handleDeletePharmacy(pharmacy)}
                        disabled={showActionLoading}
                      >
                        <i className="bi bi-trash3-fill"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Table View */}
        {viewMode === 'table' && (
          <div className="pharmacy-table-container">
            <table className="pharmacy-table">
              <thead>
                <tr>
                  <th>Pharmacy</th>
                  <th>Location</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Verification</th>
                  <th>Revenue</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index} className="skeleton-row">
                      <td><div className="skeleton-cell wide"></div></td>
                      <td><div className="skeleton-cell medium"></div></td>
                      <td><div className="skeleton-cell medium"></div></td>
                      <td><div className="skeleton-cell small"></div></td>
                      <td><div className="skeleton-cell small"></div></td>
                      <td><div className="skeleton-cell small"></div></td>
                      <td><div className="skeleton-cell actions"></div></td>
                    </tr>
                  ))
                ) : pharmacies.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="pharmacy-table-empty">
                      <i className="bi bi-inbox"></i>
                      <span>No pharmacies found</span>
                    </td>
                  </tr>
                ) : (
                  pharmacies.map((pharmacy) => (
                    <tr key={getPharmacyId(pharmacy) || pharmacy.name || pharmacy.email}>
                      <td>
                        <div className="pharmacy-table-name">
                          <div className="pharmacy-table-avatar">
                            <i className="bi bi-capsule-pill"></i>
                          </div>
                          <div>
                            <div className="name">{pharmacy.name || pharmacy.Name || 'Untitled'}</div>
                            <div className="license">{pharmacy.licenseNumber || pharmacy.LicenseNumber || 'No license'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="pharmacy-table-location">
                          <div className="city">{pharmacy.city || pharmacy.City || '—'}</div>
                          <div className="address">{pharmacy.address || pharmacy.Address || ''}</div>
                        </div>
                      </td>
                      <td>
                        <div className="pharmacy-table-contact">
                          <div className="email"><i className="bi bi-envelope"></i> {pharmacy.email || '—'}</div>
                          <div className="phone"><i className="bi bi-telephone"></i> {pharmacy.phoneNumber || '—'}</div>
                        </div>
                      </td>
                      <td>
                        <span className={`pharmacy-table-status ${pharmacy.status?.toLowerCase() === 'active' ? 'active' : 'inactive'}`}>
                          <span className="dot"></span>
                          {pharmacy.status || 'Unknown'}
                        </span>
                      </td>
                      <td>
                        <span className={`pharmacy-table-verify ${pharmacy.verified ? 'verified' : 'pending'}`}>
                          <i className={pharmacy.verified ? 'bi bi-patch-check-fill' : 'bi bi-clock'}></i>
                          {pharmacy.verified ? 'Verified' : 'Pending'}
                        </span>
                      </td>
                      <td>
                        <span className="pharmacy-table-revenue">
                          {formatCurrency(pharmacy.totalEarnings ?? pharmacy.totalRevenue ?? 0)}
                        </span>
                      </td>
                      <td>
                        <div className="pharmacy-table-actions">
                          <button className="action-btn view" onClick={() => handleViewPharmacy(pharmacy)} title="View Details">
                            <i className="bi bi-eye"></i>
                          </button>
                          <button
                            className={`action-btn ${pharmacy.verified ? 'unverify' : 'verify'}`}
                            onClick={() => handleToggleVerification(pharmacy)}
                            disabled={showActionLoading}
                            title={pharmacy.verified ? 'Unverify' : 'Verify'}
                          >
                            <i className={pharmacy.verified ? 'bi bi-x-lg' : 'bi bi-patch-check'}></i>
                          </button>
                          <button
                            className={`action-btn ${pharmacy.status?.toLowerCase() === 'active' ? 'disable' : 'enable'}`}
                            onClick={() => handleToggleStatus(pharmacy)}
                            disabled={showActionLoading}
                            title={pharmacy.status?.toLowerCase() === 'active' ? 'Disable' : 'Enable'}
                          >
                            <i className={pharmacy.status?.toLowerCase() === 'active' ? 'bi bi-pause' : 'bi bi-play'}></i>
                          </button>
                          <button
                            className="action-btn delete"
                            onClick={() => handleDeletePharmacy(pharmacy)}
                            disabled={showActionLoading}
                            title="Delete"
                          >
                            <i className="bi bi-trash3"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && pharmacies.length > 0 && pagination.totalPages > 1 && (
          <div className="pharmacy-pagination">
            <div className="pharmacy-pagination-info">
              Showing <strong>{(pagination.pageNumber - 1) * pagination.pageSize + 1}</strong> - <strong>{Math.min(pagination.pageNumber * pagination.pageSize, pagination.totalCount)}</strong> of <strong>{pagination.totalCount}</strong> pharmacies
            </div>
            <div className="pharmacy-pagination-controls">
              <button
                className="pharmacy-page-btn"
                disabled={pagination.pageNumber === 1}
                onClick={() => handlePageChange(1)}
              >
                <i className="bi bi-chevron-double-left"></i>
              </button>
              <button
                className="pharmacy-page-btn"
                disabled={pagination.pageNumber === 1}
                onClick={() => handlePageChange(pagination.pageNumber - 1)}
              >
                <i className="bi bi-chevron-left"></i>
              </button>

              {Array.from({ length: Math.min(5, pagination.totalPages) }).map((_, index) => {
                let pageNum;
                if (pagination.totalPages <= 5) {
                  pageNum = index + 1;
                } else if (pagination.pageNumber <= 3) {
                  pageNum = index + 1;
                } else if (pagination.pageNumber >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + index;
                } else {
                  pageNum = pagination.pageNumber - 2 + index;
                }

                return (
                  <button
                    key={pageNum}
                    className={`pharmacy-page-btn ${pagination.pageNumber === pageNum ? 'active' : ''}`}
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                className="pharmacy-page-btn"
                disabled={pagination.pageNumber === pagination.totalPages}
                onClick={() => handlePageChange(pagination.pageNumber + 1)}
              >
                <i className="bi bi-chevron-right"></i>
              </button>
              <button
                className="pharmacy-page-btn"
                disabled={pagination.pageNumber === pagination.totalPages}
                onClick={() => handlePageChange(pagination.totalPages)}
              >
                <i className="bi bi-chevron-double-right"></i>
              </button>
            </div>
          </div>
        )}

        {/* View Modal */}
        {showViewModal && selectedPharmacy && (
          <div className="pharmacy-modal-overlay" onClick={() => setShowViewModal(false)}>
            <div className="pharmacy-modal" onClick={(e) => e.stopPropagation()}>
              <div className="pharmacy-modal-header">
                <div className="pharmacy-modal-title">
                  <div className="pharmacy-modal-icon">
                    <i className="bi bi-capsule-pill"></i>
                  </div>
                  <div>
                    <h3>{selectedPharmacy.name || selectedPharmacy.Name || 'Pharmacy Details'}</h3>
                    <span className="pharmacy-modal-license">
                      {selectedPharmacy.licenseNumber || selectedPharmacy.LicenseNumber || 'No license'}
                    </span>
                  </div>
                </div>
                <button className="pharmacy-modal-close" onClick={() => setShowViewModal(false)}>
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>

              <div className="pharmacy-modal-body">
                <div className="pharmacy-modal-section">
                  <h4><i className="bi bi-info-circle-fill"></i> Basic Information</h4>
                  <div className="pharmacy-modal-grid">
                    <div className="pharmacy-modal-item">
                      <label>Status</label>
                      <span className={`status-pill ${selectedPharmacy.status?.toLowerCase() === 'active' ? 'active' : 'inactive'}`}>
                        {selectedPharmacy.status || 'Unknown'}
                      </span>
                    </div>
                    <div className="pharmacy-modal-item">
                      <label>Verification</label>
                      <span className={`status-pill ${selectedPharmacy.verified ? 'verified' : 'pending'}`}>
                        {selectedPharmacy.verified ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pharmacy-modal-section">
                  <h4><i className="bi bi-geo-alt-fill"></i> Location & Address</h4>
                  <div className="pharmacy-modal-grid">
                    <div className="pharmacy-modal-item full">
                      <label>Address</label>
                      <span>{selectedPharmacy.address || selectedPharmacy.Address || '—'}</span>
                    </div>
                    <div className="pharmacy-modal-item">
                      <label>District</label>
                      <span>{selectedPharmacy.district || selectedPharmacy.District || '—'}</span>
                    </div>
                    <div className="pharmacy-modal-item">
                      <label>Ward</label>
                      <span>{selectedPharmacy.ward || selectedPharmacy.Ward || '—'}</span>
                    </div>
                    <div className="pharmacy-modal-item">
                      <label>City</label>
                      <span>{selectedPharmacy.city || selectedPharmacy.City || '—'}</span>
                    </div>
                  </div>
                </div>

                <div className="pharmacy-modal-section">
                  <h4><i className="bi bi-telephone-fill"></i> Contact Information</h4>
                  <div className="pharmacy-modal-grid">
                    <div className="pharmacy-modal-item">
                      <label>Phone</label>
                      <span>{selectedPharmacy.phoneNumber || selectedPharmacy.PhoneNumber || '—'}</span>
                    </div>
                    <div className="pharmacy-modal-item">
                      <label>Email</label>
                      <span>{selectedPharmacy.email || selectedPharmacy.Email || '—'}</span>
                    </div>
                  </div>
                </div>

                <div className="pharmacy-modal-section">
                  <h4><i className="bi bi-clock-fill"></i> Operating Hours & Services</h4>
                  <div className="pharmacy-modal-grid">
                    <div className="pharmacy-modal-item">
                      <label>Working Hours</label>
                      <span>
                        {selectedPharmacy.open24Hours
                          ? '24/7 Open'
                          : `${selectedPharmacy.openTime || '—'} - ${selectedPharmacy.closeTime || '—'}`}
                      </span>
                    </div>
                    <div className="pharmacy-modal-item">
                      <label>Delivery Service</label>
                      <span>{selectedPharmacy.deliveryAvailable ? `Yes (${selectedPharmacy.deliveryRadius || 0} km)` : 'No'}</span>
                    </div>
                  </div>
                </div>

                <div className="pharmacy-modal-section">
                  <h4><i className="bi bi-bank"></i> Payment Information</h4>
                  <div className="pharmacy-modal-grid">
                    <div className="pharmacy-modal-item">
                      <label>Bank Name</label>
                      <span>{selectedPharmacy.bankName || selectedPharmacy.BankName || '—'}</span>
                    </div>
                    <div className="pharmacy-modal-item">
                      <label>Account Number</label>
                      <span>{selectedPharmacy.bankAccount || selectedPharmacy.BankAccount || '—'}</span>
                    </div>
                    <div className="pharmacy-modal-item">
                      <label>Total Revenue</label>
                      <span className="revenue-value">
                        {formatCurrency(selectedPharmacy.totalEarnings ?? selectedPharmacy.totalRevenue ?? 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {(selectedPharmacy.description || selectedPharmacy.Description) && (
                  <div className="pharmacy-modal-section">
                    <h4><i className="bi bi-card-text"></i> Description</h4>
                    <p className="pharmacy-description">
                      {selectedPharmacy.description || selectedPharmacy.Description}
                    </p>
                  </div>
                )}
              </div>

              <div className="pharmacy-modal-footer">
                <button className="pharmacy-modal-btn secondary" onClick={() => setShowViewModal(false)}>
                  <i className="bi bi-x-circle"></i>
                  Close
                </button>
                <button
                  className={`pharmacy-modal-btn ${selectedPharmacy.verified ? 'warning' : 'success'}`}
                  onClick={() => {
                    handleToggleVerification(selectedPharmacy);
                    setShowViewModal(false);
                  }}
                >
                  <i className={selectedPharmacy.verified ? 'bi bi-x-lg' : 'bi bi-patch-check'}></i>
                  {selectedPharmacy.verified ? 'Unverify' : 'Verify'}
                </button>
              </div>
            </div>
          </div>
        )}

        <Toast show={toast.show} onClose={hideToast} title={toast.title} message={toast.message} type={toast.type} duration={toast.duration} />
      </main>
    </NavbarAdmin>
  );
}
