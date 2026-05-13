import React, { useState, useEffect } from "react";
import NavbarAdmin from "./NavbarAdmin";
import { pharmaciesApi } from "../../../services/adminApi";
import Toast from "./Toast";
import useToast from "../useToast";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../Css/Admin.css";

export default function PharmacyManagement() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast, showToast, hideToast } = useToast();

  const [pagination, setPagination] = useState({
    pageNumber: 1,
    pageSize: 10,
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

  const normalizePharmacyResponse = (response) => {
    const items = response.pharmacies ?? response.content ?? response.data ?? [];
    const pageNumber = response.pageNumber ?? (response.number != null ? response.number + 1 : pagination.pageNumber);
    const pageSize = response.pageSize ?? response.size ?? pagination.pageSize;
    const totalCount = response.totalCount ?? response.totalElements ?? items.length;
    const totalPages = response.totalPages ?? (pageSize > 0 ? Math.ceil(totalCount / pageSize) : 1);
    return { items, pageNumber, pageSize, totalCount, totalPages };
  };

  const getPharmacyId = (pharmacy) => pharmacy.id ?? pharmacy.pharmacyId ?? pharmacy.pharmacyID ?? pharmacy.pharmacyID ?? pharmacy._id;

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
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to fetch pharmacies');
      console.error('Error fetching pharmacies:', err);
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
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value));
  };

  const formatBoolean = (value) => (value ? 'Yes' : 'No');

  return (
    <NavbarAdmin sidebarCollapsed={sidebarCollapsed} onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}>
      <main className="admin-content p-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3 mb-4">
          <div>
            <h2 className="admin-page-title mb-2">Pharmacy Management</h2>
            <p className="admin-page-subtitle mb-0">View, verify, and manage pharmacy accounts across the platform.</p>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger admin-alert" role="alert">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
          </div>
        )}

        <div className="admin-card mb-4 p-3">
          <div className="row g-3">
            <div className="col-12 col-md-4">
              <input
                type="text"
                className="form-control"
                placeholder="Search pharmacies..."
                value={filters.searchTerm}
                onChange={handleSearch}
              />
            </div>
            <div className="col-6 col-md-2">
              <select className="form-select" value={filters.status} onChange={handleFilterChange('status')}>
                <option value="">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
            <div className="col-6 col-md-2">
              <select className="form-select" value={filters.verified} onChange={handleFilterChange('verified')}>
                <option value="">Verification</option>
                <option value="true">Verified</option>
                <option value="false">Not Verified</option>
              </select>
            </div>
            <div className="col-6 col-md-2">
              <input
                type="text"
                className="form-control"
                placeholder="City"
                value={filters.city}
                onChange={handleFilterChange('city')}
              />
            </div>
            <div className="col-6 col-md-2">
              <select className="form-select" value={filters.sortBy} onChange={handleSort}>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="active">Active</option>
                <option value="verified">Verified</option>
              </select>
            </div>
          </div>
        </div>

        <div className="admin-card table-responsive mb-4">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Pharmacy</th>
                <th>Location</th>
                <th>Status</th>
                <th>Verified</th>
                <th>Contact</th>
                <th>Revenue</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : pharmacies.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-5">No pharmacies found.</td>
                </tr>
              ) : (
                pharmacies.map((pharmacy) => (
                  <tr key={getPharmacyId(pharmacy) || pharmacy.name || pharmacy.email}>
                    <td>
                      <div className="fw-semibold">{pharmacy.name || pharmacy.Name || 'Untitled'}</div>
                      <div className="text-muted small">{pharmacy.licenseNumber || pharmacy.LicenseNumber}</div>
                    </td>
                    <td>
                      <div>{pharmacy.city || pharmacy.City || '—'}</div>
                      <div className="text-muted small">{pharmacy.address || pharmacy.Address || pharmacy.district || ''}</div>
                    </td>
                    <td>
                      <span className={`badge ${pharmacy.status?.toLowerCase() === 'active' ? 'bg-success' : 'bg-secondary'}`}>
                        {pharmacy.status || pharmacy.Status || 'Unknown'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${pharmacy.verified ? 'bg-success' : 'bg-warning'}`}>
                        {pharmacy.verified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                    <td>
                      <div>{pharmacy.email || pharmacy.Email || '—'}</div>
                      <div className="text-muted small">{pharmacy.phoneNumber || pharmacy.PhoneNumber || '—'}</div>
                    </td>
                    <td>{formatCurrency(pharmacy.totalEarnings ?? pharmacy.totalRevenue ?? pharmacy.revenue)}</td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={() => handleViewPharmacy(pharmacy)}>
                        View
                      </button>
                      <button className="btn btn-sm btn-outline-success me-1" onClick={() => handleToggleVerification(pharmacy)} disabled={showActionLoading}>
                        {pharmacy.verified ? 'Unverify' : 'Verify'}
                      </button>
                      <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => handleToggleStatus(pharmacy)} disabled={showActionLoading}>
                        {pharmacy.status?.toLowerCase() === 'active' ? 'Disable' : 'Enable'}
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeletePharmacy(pharmacy)} disabled={showActionLoading}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="d-flex justify-content-between align-items-center mt-3">
            <div className="text-muted">Showing page {pagination.pageNumber} of {pagination.totalPages}</div>
            <div className="btn-group">
              <button className="btn btn-outline-secondary btn-sm" disabled={pagination.pageNumber === 1} onClick={() => handlePageChange(pagination.pageNumber - 1)}>
                Previous
              </button>
              <button className="btn btn-outline-secondary btn-sm" disabled>{pagination.pageNumber}</button>
              <button className="btn btn-outline-secondary btn-sm" disabled={pagination.pageNumber === pagination.totalPages} onClick={() => handlePageChange(pagination.pageNumber + 1)}>
                Next
              </button>
            </div>
          </div>
        )}

        {showViewModal && selectedPharmacy && (
          <div className="modal d-block" tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Pharmacy Details</h5>
                  <button type="button" className="btn-close" aria-label="Close" onClick={() => setShowViewModal(false)} />
                </div>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <strong>Name</strong>
                      <p>{selectedPharmacy.name || selectedPharmacy.Name || '—'}</p>
                    </div>
                    <div className="col-md-6">
                      <strong>License</strong>
                      <p>{selectedPharmacy.licenseNumber || selectedPharmacy.LicenseNumber || '—'}</p>
                    </div>
                    <div className="col-md-6">
                      <strong>Contact</strong>
                      <p>{selectedPharmacy.phoneNumber || selectedPharmacy.PhoneNumber || '—'}</p>
                      <p>{selectedPharmacy.email || selectedPharmacy.Email || '—'}</p>
                    </div>
                    <div className="col-md-6">
                      <strong>Status</strong>
                      <p>{selectedPharmacy.status || selectedPharmacy.Status || '—'}</p>
                      <strong>Verified</strong>
                      <p>{selectedPharmacy.verified ? 'Yes' : 'No'}</p>
                    </div>
                    <div className="col-md-12">
                      <strong>Address</strong>
                      <p>{selectedPharmacy.address || selectedPharmacy.Address || '—'}</p>
                      <p>{selectedPharmacy.district || selectedPharmacy.District} {selectedPharmacy.city || selectedPharmacy.City} {selectedPharmacy.ward || selectedPharmacy.Ward}</p>
                    </div>
                    <div className="col-md-6">
                      <strong>Working hours</strong>
                      <p>{selectedPharmacy.open24Hours ? '24/7' : `${selectedPharmacy.openTime || selectedPharmacy.OpenTime || '—'} - ${selectedPharmacy.closeTime || selectedPharmacy.CloseTime || '—'}`}</p>
                    </div>
                    <div className="col-md-6">
                      <strong>Delivery</strong>
                      <p>{formatBoolean(selectedPharmacy.deliveryAvailable || selectedPharmacy.DeliveryAvailable)}</p>
                      <p>{selectedPharmacy.deliveryRadius ? `${selectedPharmacy.deliveryRadius} km` : '—'}</p>
                    </div>
                    <div className="col-md-12">
                      <strong>Bank / Payment Info</strong>
                      <p>{selectedPharmacy.bankName || selectedPharmacy.BankName || '—'}</p>
                      <p>{selectedPharmacy.bankAccount || selectedPharmacy.BankAccount || selectedPharmacy.paypalEmail || selectedPharmacy.PaypalEmail || '—'}</p>
                    </div>
                    <div className="col-md-12">
                      <strong>Description</strong>
                      <p>{selectedPharmacy.description || selectedPharmacy.Description || 'No description provided'}</p>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowViewModal(false)}>
                    Close
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
