import React, { useState, useEffect } from "react";
import NavbarAdmin from "./NavbarAdmin";
import { registrationsApi } from "../../../services/adminApi";
import Toast from "./Toast";
import useToast from "../useToast";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../Css/Admin.css";
import "../Css/Registrations.css";

export default function Registrations() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [requests, setRequests] = useState([]);
  const { toast, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    pageNumber: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0
  });
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    sortBy: 'newest'
  });

  // Modal states
  const [showViewModal, setShowViewModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  // Fetch registrations from API
  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await registrationsApi.getAll({
        pageNumber: pagination.pageNumber,
        pageSize: pagination.pageSize,
        ...filters
      });

      if (response) {
        setRequests(response.requests || []);
        setPagination({
          pageNumber: response.pageNumber || 1,
          pageSize: response.pageSize || 10,
          totalCount: response.totalCount || 0,
          totalPages: response.totalPages || 0
        });
      }
    } catch (err) {
      console.error('Error fetching registrations:', err);
      const errorMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Failed to fetch registration requests';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, [pagination.pageNumber, filters]);

  // Handle type filter
  const handleTypeFilter = (e) => {
    setFilters({ ...filters, type: e.target.value });
    setPagination({ ...pagination, pageNumber: 1 });
  };

  // Handle status filter
  const handleStatusFilter = (e) => {
    setFilters({ ...filters, status: e.target.value });
    setPagination({ ...pagination, pageNumber: 1 });
  };

  // Handle sort
  const handleSort = (e) => {
    setFilters({ ...filters, sortBy: e.target.value });
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    setPagination({ ...pagination, pageNumber: newPage });
  };

  // Handle view request details
  const handleViewRequest = (request) => {
    setSelectedRequest(request);
    setShowViewModal(true);
  };

  // Handle approve
  const handleApprove = async (request) => {
    if (!window.confirm(`Are you sure you want to approve this ${request.registrationType.toLowerCase()} registration?`)) {
      return;
    }

    setProcessing(true);
    try {
      await registrationsApi.review(request.requestId, 'APPROVE');
      showToast({
        title: 'Success',
        message: `${request.registrationType} registration approved successfully!`,
        type: 'success'
      });
      fetchRegistrations();
      setShowViewModal(false);
    } catch (err) {
      showToast({
        title: 'Error',
        message: err.response?.data?.message || 'Failed to approve registration',
        type: 'error'
      });
    } finally {
      setProcessing(false);
    }
  };

  // Handle reject
  const handleRejectClick = (request) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async () => {
    if (!rejectionReason.trim()) {
      showToast({
        title: 'Warning',
        message: 'Please provide a rejection reason',
        type: 'warning'
      });
      return;
    }

    setProcessing(true);
    try {
      await registrationsApi.review(selectedRequest.requestId, 'REJECT', rejectionReason);
      showToast({
        title: 'Success',
        message: 'Registration request rejected',
        type: 'success'
      });
      fetchRegistrations();
      setShowRejectModal(false);
      setShowViewModal(false);
    } catch (err) {
      showToast({
        title: 'Error',
        message: err.response?.data?.message || 'Failed to reject registration',
        type: 'error'
      });
    } finally {
      setProcessing(false);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Pending': return 'status-badge pending';
      case 'Approved': return 'status-badge approved';
      case 'Rejected': return 'status-badge rejected';
      default: return 'status-badge';
    }
  };

  // Get type badge class
  const getTypeBadgeClass = (type) => {
    return type === 'DOCTOR' ? 'type-badge doctor' : 'type-badge pharmacy';
  };

  // Render page numbers
  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, pagination.pageNumber - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(pagination.totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          className={`page-btn ${pagination.pageNumber === i ? 'active' : ''}`}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </button>
      );
    }
    return pages;
  };

  return (
    <NavbarAdmin
      sidebarCollapsed={sidebarCollapsed}
      onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
    >
      <main className="admin-content p-4">
          {/* Header */}
          <div className="page-header">
            <div className="header-left">
              <h1><i className="bi bi-person-plus"></i> Registration Requests</h1>
              <p>Manage doctor and pharmacy registration requests</p>
            </div>
            <div className="header-stats">
              <div className="stat-item">
                <span className="stat-number">{pagination.totalCount}</span>
                <span className="stat-label">Total Requests</span>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="filters-bar">
            <div className="filter-group">
              <select
                className="filter-select"
                value={filters.type}
                onChange={handleTypeFilter}
              >
                <option value="">All Types</option>
                <option value="DOCTOR">Doctor</option>
                <option value="PHARMACY">Pharmacy</option>
              </select>

              <select
                className="filter-select"
                value={filters.status}
                onChange={handleStatusFilter}
              >
                <option value="">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>

              <select
                className="filter-select"
                value={filters.sortBy}
                onChange={handleSort}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="loading-state">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p>Loading registration requests...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <i className="bi bi-exclamation-triangle"></i>
              <p>{error}</p>
              <button className="btn btn-primary" onClick={fetchRegistrations}>
                Retry
              </button>
            </div>
          ) : requests.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-inbox"></i>
              <p>No registration requests found</p>
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Name/Email</th>
                      <th>Phone</th>
                      <th>Submitted</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((request) => (
                      <tr key={request.requestId}>
                        <td>
                          <span className={getTypeBadgeClass(request.registrationType)}>
                            <i className={`bi ${request.registrationType === 'DOCTOR' ? 'bi-person-badge' : 'bi-shop'}`}></i>
                            {request.registrationType}
                          </span>
                        </td>
                        <td>
                          <div className="name-cell">
                            <strong>{request.registrationType === 'DOCTOR' ? request.fullName : request.pharmacyName}</strong>
                            <span className="email-text">{request.email}</span>
                          </div>
                        </td>
                        <td>{request.phoneNumber}</td>
                        <td>{formatDate(request.createdAt)}</td>
                        <td>
                          <span className={getStatusBadgeClass(request.status)}>
                            {request.status}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              className="btn-icon view"
                              onClick={() => handleViewRequest(request)}
                              title="View Details"
                            >
                              <i className="bi bi-eye"></i>
                            </button>
                            {request.status === 'Pending' && (
                              <>
                                <button
                                  className="btn-icon approve"
                                  onClick={() => handleApprove(request)}
                                  disabled={processing}
                                  title="Approve"
                                >
                                  <i className="bi bi-check-lg"></i>
                                </button>
                                <button
                                  className="btn-icon reject"
                                  onClick={() => handleRejectClick(request)}
                                  disabled={processing}
                                  title="Reject"
                                >
                                  <i className="bi bi-x-lg"></i>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="pagination-container">
                  <button
                    className="page-btn nav"
                    onClick={() => handlePageChange(pagination.pageNumber - 1)}
                    disabled={pagination.pageNumber === 1}
                  >
                    <i className="bi bi-chevron-left"></i>
                  </button>
                  {renderPageNumbers()}
                  <button
                    className="page-btn nav"
                    onClick={() => handlePageChange(pagination.pageNumber + 1)}
                    disabled={pagination.pageNumber === pagination.totalPages}
                  >
                    <i className="bi bi-chevron-right"></i>
                  </button>
                </div>
              )}
            </>
          )}
      </main>

      {/* View Modal */}
      {showViewModal && selectedRequest && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className={`bi ${selectedRequest.registrationType === 'DOCTOR' ? 'bi-person-badge' : 'bi-shop'}`}></i>
                {selectedRequest.registrationType === 'DOCTOR' ? 'Doctor' : 'Pharmacy'} Registration Details
              </h3>
              <button className="close-btn" onClick={() => setShowViewModal(false)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                {/* Common Info */}
                <div className="detail-section">
                  <h4><i className="bi bi-info-circle"></i> Basic Information</h4>
                  <div className="detail-row">
                    <span className="label">Email:</span>
                    <span className="value">{selectedRequest.email}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Phone:</span>
                    <span className="value">{selectedRequest.phoneNumber}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Status:</span>
                    <span className={getStatusBadgeClass(selectedRequest.status)}>
                      {selectedRequest.status}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Submitted:</span>
                    <span className="value">{formatDate(selectedRequest.createdAt)}</span>
                  </div>
                  {selectedRequest.reviewedAt && (
                    <div className="detail-row">
                      <span className="label">Reviewed:</span>
                      <span className="value">{formatDate(selectedRequest.reviewedAt)}</span>
                    </div>
                  )}
                  {selectedRequest.rejectionReason && (
                    <div className="detail-row rejection">
                      <span className="label">Rejection Reason:</span>
                      <span className="value">{selectedRequest.rejectionReason}</span>
                    </div>
                  )}
                </div>

                {/* Doctor Specific */}
                {selectedRequest.registrationType === 'DOCTOR' && (
                  <>
                    <div className="detail-section">
                      <h4><i className="bi bi-person"></i> Personal Information</h4>
                      <div className="detail-row">
                        <span className="label">Full Name:</span>
                        <span className="value">{selectedRequest.fullName}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Location:</span>
                        <span className="value">{selectedRequest.location}</span>
                      </div>
                    </div>
                    <div className="detail-section">
                      <h4><i className="bi bi-briefcase"></i> Professional Information</h4>
                      <div className="detail-row">
                        <span className="label">Qualifications:</span>
                        <span className="value">{selectedRequest.qualifications}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Specialty:</span>
                        <span className="value">{selectedRequest.specialty}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Experience:</span>
                        <span className="value">{selectedRequest.yearsOfExperience} years</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Languages:</span>
                        <span className="value">{selectedRequest.languageSpoken}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Consultation Fee:</span>
                        <span className="value">{selectedRequest.consultationFee?.toLocaleString()} VND</span>
                      </div>
                    </div>
                    <div className="detail-section">
                      <h4><i className="bi bi-hospital"></i> Clinic Information</h4>
                      <div className="detail-row">
                        <span className="label">Clinic Name:</span>
                        <span className="value">{selectedRequest.clinicName || 'N/A'}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Clinic Address:</span>
                        <span className="value">{selectedRequest.clinicAddress || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="detail-section">
                      <h4><i className="bi bi-calendar-check"></i> Availability</h4>
                      <div className="availability-tags">
                        {selectedRequest.availableForVideo && <span className="avail-tag"><i className="bi bi-camera-video"></i> Video</span>}
                        {selectedRequest.availableForAudio && <span className="avail-tag"><i className="bi bi-telephone"></i> Audio</span>}
                        {selectedRequest.availableForChat && <span className="avail-tag"><i className="bi bi-chat-dots"></i> Chat</span>}
                        {selectedRequest.availableForOffline && <span className="avail-tag"><i className="bi bi-person-workspace"></i> In-Person</span>}
                      </div>
                    </div>
                    {selectedRequest.bio && (
                      <div className="detail-section full-width">
                        <h4><i className="bi bi-card-text"></i> Bio</h4>
                        <p className="bio-text">{selectedRequest.bio}</p>
                      </div>
                    )}
                  </>
                )}

                {/* Pharmacy Specific */}
                {selectedRequest.registrationType === 'PHARMACY' && (
                  <>
                    <div className="detail-section">
                      <h4><i className="bi bi-shop"></i> Pharmacy Information</h4>
                      <div className="detail-row">
                        <span className="label">Pharmacy Name:</span>
                        <span className="value">{selectedRequest.pharmacyName}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">License Number:</span>
                        <span className="value">{selectedRequest.licenseNumber}</span>
                      </div>
                    </div>
                    <div className="detail-section">
                      <h4><i className="bi bi-geo-alt"></i> Location</h4>
                      <div className="detail-row">
                        <span className="label">Address:</span>
                        <span className="value">{selectedRequest.address}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">City:</span>
                        <span className="value">{selectedRequest.city || 'N/A'}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">District:</span>
                        <span className="value">{selectedRequest.district || 'N/A'}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Ward:</span>
                        <span className="value">{selectedRequest.ward || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="detail-section">
                      <h4><i className="bi bi-clock"></i> Business Hours</h4>
                      <div className="detail-row">
                        <span className="label">Open 24 Hours:</span>
                        <span className="value">{selectedRequest.open24Hours ? 'Yes' : 'No'}</span>
                      </div>
                      {!selectedRequest.open24Hours && (
                        <div className="detail-row">
                          <span className="label">Hours:</span>
                          <span className="value">{selectedRequest.openTime} - {selectedRequest.closeTime}</span>
                        </div>
                      )}
                      <div className="detail-row">
                        <span className="label">Working Days:</span>
                        <span className="value">{selectedRequest.workingDays}</span>
                      </div>
                    </div>
                    <div className="detail-section">
                      <h4><i className="bi bi-truck"></i> Delivery</h4>
                      <div className="detail-row">
                        <span className="label">Delivery Available:</span>
                        <span className="value">{selectedRequest.deliveryAvailable ? 'Yes' : 'No'}</span>
                      </div>
                      {selectedRequest.deliveryAvailable && (
                        <>
                          <div className="detail-row">
                            <span className="label">Delivery Radius:</span>
                            <span className="value">{selectedRequest.deliveryRadius} km</span>
                          </div>
                          <div className="detail-row">
                            <span className="label">Delivery Fee:</span>
                            <span className="value">{selectedRequest.deliveryFee?.toLocaleString()} VND</span>
                          </div>
                        </>
                      )}
                    </div>
                    {selectedRequest.description && (
                      <div className="detail-section full-width">
                        <h4><i className="bi bi-card-text"></i> Description</h4>
                        <p className="bio-text">{selectedRequest.description}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="modal-footer">
              {selectedRequest.status === 'Pending' && (
                <>
                  <button
                    className="btn btn-success"
                    onClick={() => handleApprove(selectedRequest)}
                    disabled={processing}
                  >
                    <i className="bi bi-check-lg"></i> Approve
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleRejectClick(selectedRequest)}
                    disabled={processing}
                  >
                    <i className="bi bi-x-lg"></i> Reject
                  </button>
                </>
              )}
              <button className="btn btn-secondary" onClick={() => setShowViewModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal-content small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header danger">
              <h3><i className="bi bi-x-circle"></i> Reject Registration</h3>
              <button className="close-btn" onClick={() => setShowRejectModal(false)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="modal-body">
              <p className="confirm-text">
                You are about to reject the registration for:
                <strong>
                  {selectedRequest.registrationType === 'DOCTOR'
                    ? selectedRequest.fullName
                    : selectedRequest.pharmacyName}
                </strong>
              </p>
              <div className="form-group">
                <label>Rejection Reason <span className="required">*</span></label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a reason for rejection..."
                  rows="4"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-danger"
                onClick={handleRejectSubmit}
                disabled={processing || !rejectionReason.trim()}
              >
                {processing ? 'Processing...' : 'Confirm Rejection'}
              </button>
              <button className="btn btn-secondary" onClick={() => setShowRejectModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast {...toast} onClose={hideToast} />
    </NavbarAdmin>
  );
}
