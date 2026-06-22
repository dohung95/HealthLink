import React, { useState, useEffect } from "react";
import NavbarAdmin from "./NavbarAdmin";
import { doctorsApi } from "../../../api/adminApi";
import Toast from "./Toast";
import useToast from "../useToast";
import { getAvatarUrl } from "../../../utils/avatarHelper";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../Css/Admin.css";

export default function Doctors() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast, showToast, hideToast } = useToast();
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('doctorsViewMode') || 'grid';
  });
  const [pagination, setPagination] = useState({
    pageNumber: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0
  });
  const [filters, setFilters] = useState({
    searchTerm: '',
    specialty: '',
    sortBy: 'newest'
  });

  // Modal states
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');

  // Edit form state
  const [editForm, setEditForm] = useState({
    fullName: '',
    phoneNumber: '',
    specialty: '',
    qualifications: '',
    yearsOfExperience: '',
    languageSpoken: '',
    location: ''
  });

  // Specialties from database
  const [specialties, setSpecialties] = useState([]);

  // Fetch doctors from API
  const fetchDoctors = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await doctorsApi.getAll({
        pageNumber: pagination.pageNumber,
        pageSize: pagination.pageSize,
        ...filters
      });

      setDoctors(response.doctors);
      setPagination({
        pageNumber: response.pageNumber,
        pageSize: response.pageSize,
        totalCount: response.totalCount,
        totalPages: response.totalPages
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch doctors');
      console.error('Error fetching doctors:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on component mount and when filters/pagination change
  useEffect(() => {
    fetchDoctors();
  }, [pagination.pageNumber, filters]);

  // Fetch specialties from database
  useEffect(() => {
    const fetchSpecialties = async () => {
      try {
        const data = await doctorsApi.getSpecialties();
        if (Array.isArray(data)) {
          setSpecialties(data);
        }
      } catch (err) {
        console.error('Error fetching specialties:', err);
      }
    };
    fetchSpecialties();
  }, []);

  // Handle search
  const handleSearch = (e) => {
    setFilters({ ...filters, searchTerm: e.target.value });
    setPagination({ ...pagination, pageNumber: 1 }); // Reset to page 1
  };

  // Handle specialty filter
  const handleSpecialtyFilter = (e) => {
    setFilters({ ...filters, specialty: e.target.value });
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

  // Handle view doctor details
  const handleViewDoctor = async (doctor) => {
    setSelectedDoctor(doctor);
    setShowViewModal(true);
  };

  // Handle edit doctor
  const handleEditDoctor = (doctor) => {
    setSelectedDoctor(doctor);
    setEditForm({
      fullName: doctor.fullName,
      phoneNumber: doctor.phone || '',  // Changed from doctor.phoneNumber to doctor.phone
      specialty: doctor.specialty || '',
      qualifications: doctor.qualifications || '',
      yearsOfExperience: doctor.yearsOfExperience || '',
      languageSpoken: doctor.languageSpoken || '',
      location: doctor.location || ''
    });
    setShowEditModal(true);
  };

  // Handle update doctor
  const handleUpdateDoctor = async (e) => {
    e.preventDefault();

    try {
      // Prepare data according to AdminDoctorUpdateDto (using camelCase to match backend)
      const updateData = {
        fullName: editForm.fullName,
        phoneNumber: editForm.phoneNumber,
        specialty: editForm.specialty,
        qualifications: editForm.qualifications,
        yearsOfExperience: editForm.yearsOfExperience !== '' && editForm.yearsOfExperience !== null
          ? parseInt(editForm.yearsOfExperience)
          : null,
        languageSpoken: editForm.languageSpoken,
        location: editForm.location
      };

      await doctorsApi.update(selectedDoctor.doctorId, updateData);

      // Close modal first
      setShowEditModal(false);

      // Then fetch updated data
      await fetchDoctors();

      // Finally show success message
      showToast({
        title: 'Success!',
        message: 'Doctor information has been updated successfully',
        type: 'success'
      });
    } catch (err) {


      const errorMessage = err.response?.data?.error || err.response?.data?.details || err.message || 'Failed to update doctor';
      showToast({
        title: 'Update Failed',
        message: errorMessage,
        type: 'error',
        duration: 5000
      });
    }
  };

  // Handle change status
  const handleChangeStatus = (doctor) => {
    setSelectedDoctor(doctor);
    setNewStatus(doctor.status);
    setStatusReason('');
    setShowStatusModal(true);
  };

  // Handle update status
  const handleUpdateStatus = async () => {
    if (!statusReason.trim()) {
      showToast({ title: 'Validation Error', message: 'Please provide a reason for status change', type: 'error' });
      return;
    }
    try {
      await doctorsApi.updateStatus(selectedDoctor.doctorId, newStatus, statusReason);

      // Update the doctor list immediately without refetching
      setDoctors(prevDoctors =>
        prevDoctors.map(doctor =>
          doctor.doctorId === selectedDoctor.doctorId
            ? { ...doctor, status: newStatus }
            : doctor
        )
      );

      setShowStatusModal(false);

      // Show success message
      showToast({
        title: 'Status Updated',
        message: 'Doctor status has been updated successfully',
        type: 'success'
      });
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.response?.data?.details || err.message || 'Failed to update status';
      showToast({
        title: 'Update Failed',
        message: errorMessage,
        type: 'error',
        duration: 5000
      });
    }
  };

  // Get status badge color
  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-success';
      case 'inactive':
        return 'bg-secondary';
      case 'suspended':
        return 'bg-warning';
      case 'banned':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  };


  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Toggle view mode
  const toggleViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem('doctorsViewMode', mode);
  };

  // Get avatar gradient class based on name
  const getAvatarGradient = (name) => {
    const charCode = name.charCodeAt(0);
    const gradientNumber = (charCode % 10) + 1;
    return `avatar-gradient-${gradientNumber}`;
  };

  // Get status dot class
  const getStatusDotClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'status-dot-active';
      case 'inactive':
        return 'status-dot-inactive';
      case 'suspended':
        return 'status-dot-suspended';
      case 'banned':
        return 'status-dot-banned';
      default:
        return 'status-dot-inactive';
    }
  };

  // Get status badge class for card view
  const getStatusBadgeCardClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'status-badge-active';
      case 'inactive':
        return 'status-badge-inactive';
      case 'suspended':
        return 'status-badge-suspended';
      case 'banned':
        return 'status-badge-banned';
      default:
        return 'status-badge-inactive';
    }
  };

  // Get specialty badge class
  const getSpecialtyBadgeClass = (specialty) => {
    const specialtyLower = specialty?.toLowerCase();
    if (specialtyLower?.includes('cardio')) return 'specialty-cardiology';
    if (specialtyLower?.includes('derm')) return 'specialty-dermatology';
    if (specialtyLower?.includes('neuro')) return 'specialty-neurology';
    if (specialtyLower?.includes('pediatric')) return 'specialty-pediatrics';
    if (specialtyLower?.includes('psychiat')) return 'specialty-psychiatry';
    return 'specialty-general';
  };

  return (
    <NavbarAdmin
      sidebarCollapsed={sidebarCollapsed}
      onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
    >
      <main className="admin-content p-4">
        {/* Doctors Page Header with Visual Distinction */}
        <div className="admin-page-header-doctors mb-4">
          <div className="d-flex justify-content-between align-items-start">
            <div className="admin-page-title-section">
              <div className="d-flex align-items-center gap-3 mb-2">
                <div className="admin-page-icon-doctors">
                  <i className="bi bi-clipboard2-pulse-fill"></i>
                </div>
                <div>
                  <h2 className="admin-page-title mb-1">
                    Doctors Management
                  </h2>
                  <div className="d-flex align-items-center gap-2">
                    <span className="admin-page-badge-doctors">
                      <i className="bi bi-heart-pulse-fill me-1"></i>
                      Medical Professionals
                    </span>
                    <span className="admin-page-count">
                      {pagination.totalCount} {pagination.totalCount === 1 ? 'Doctor' : 'Doctors'}
                    </span>
                  </div>
                </div>
              </div>
              <p className="admin-page-subtitle-doctors mb-0">
                Manage healthcare providers, specialties, and professional credentials
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

        {/* Compact Filter Bar */}
        <div className="admin-filter-bar">
          <div className="filter-search">
            <i className="bi bi-search"></i>
            <input
              type="text"
              className="form-control"
              placeholder="Search doctors..."
              value={filters.searchTerm}
              onChange={handleSearch}
            />
          </div>
          <div className="filter-select">
            <select
              className="form-select"
              value={filters.specialty}
              onChange={handleSpecialtyFilter}
            >
              <option value="">All Specialties</option>
              {specialties.map(spec => (
                <option key={spec.specialtyId} value={spec.name}>
                  {spec.name}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-select">
            <select
              className="form-select"
              value={filters.sortBy}
              onChange={handleSort}
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
            </select>
          </div>
          <div className="filter-actions">
            {(filters.searchTerm || filters.specialty) && (
              <button
                className="btn btn-outline-secondary btn-clear-filter"
                onClick={() => {
                  setFilters({ searchTerm: '', specialty: '', sortBy: 'newest' });
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

        {/* Doctors Display - Grid or Table */}
        {viewMode === 'grid' ? (
          /* Card Grid View */
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
          ) : doctors.length === 0 ? (
            <div className="card-grid-empty">
              <i className="bi bi-inbox"></i>
              <h4>No doctors found</h4>
              <p>Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="card-grid-container">
              {doctors.map((doctor) => (
                <div
                  key={doctor.doctorId}
                  className="doctor-card"
                  onClick={() => handleViewDoctor(doctor)}
                >
                  <div className="card-header-section">
                    <div className="card-avatar-container">
                      <div className={`card-avatar ${getAvatarGradient(doctor.fullName)}`}>
                        {getAvatarUrl(doctor.avatarUrl) ? (
                          <img src={getAvatarUrl(doctor.avatarUrl)} alt={doctor.fullName} style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%'}} />
                        ) : (
                          doctor.fullName.charAt(0)
                        )}
                      </div>
                      <div className={`status-indicator-dot ${getStatusDotClass(doctor.status)}`}></div>
                    </div>
                    <div className="card-info-section">
                      <h3 className="card-title">{doctor.fullName}</h3>
                      <p className="card-subtitle">{doctor.yearsOfExperience ? `${doctor.yearsOfExperience} years exp.` : 'New'}</p>
                    </div>
                  </div>

                  <div className="card-badges">
                    <span className={`specialty-badge ${getSpecialtyBadgeClass(doctor.specialty)}`}>
                      {doctor.specialty}
                    </span>
                    {doctor.verified && (
                      <span className="verified-badge">
                        <i className="bi bi-patch-check-fill"></i> Verified
                      </span>
                    )}
                    <span className={`status-badge ${getStatusBadgeCardClass(doctor.status)}`}>
                      {doctor.status}
                    </span>
                  </div>

                  <div className="card-details">
                    {doctor.clinicName && (
                      <div className="card-detail-item">
                        <i className="bi bi-hospital"></i>
                        <span>{doctor.clinicName}</span>
                      </div>
                    )}
                    <div className="card-detail-item">
                      <i className="bi bi-envelope"></i>
                      <span>{doctor.email}</span>
                    </div>
                    {doctor.consultationFee && (
                      <div className="card-detail-item">
                        <i className="bi bi-currency-dollar"></i>
                        <span>${Number(doctor.consultationFee).toFixed(2)}/session</span>
                      </div>
                    )}
                    {/* Consultation Types */}
                    <div className="card-detail-item">
                      <div className="consultation-types">
                        {doctor.services?.includes('ONLINE') && <span className="consult-badge online" title="Online"><i className="bi bi-globe"></i></span>}
                        {doctor.services?.includes('HOME_VISIT') && <span className="consult-badge home-visit" title="Home Visit"><i className="bi bi-house-heart-fill"></i></span>}
                      </div>
                    </div>
                    {/* Rating */}
                    {doctor.rating && (
                      <div className="card-detail-item">
                        <div className="card-rating">
                          <span className="rating-stars">
                            {[...Array(5)].map((_, i) => (
                              <i
                                key={i}
                                className={`bi ${i < Math.floor(doctor.rating) ? 'bi-star-fill' : 'bi-star'}`}
                              ></i>
                            ))}
                          </span>
                          <span className="rating-number" style={{ fontSize: '1.8rem' }}>
                            {doctor.rating.toFixed(1)}
                          </span>
                          {doctor.totalReviews && (
                            <span className="rating-count">({doctor.totalReviews})</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="card-footer">
                    <button
                      className="card-action-btn primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDoctor(doctor);
                      }}
                      title="View Details"
                    >
                      <i className="bi bi-eye"></i>
                      View
                    </button>
                    <button
                      className="card-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditDoctor(doctor);
                      }}
                      title="Edit Doctor"
                    >
                      <i className="bi bi-pencil"></i>
                      Edit
                    </button>
                    <button
                      className="card-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleChangeStatus(doctor);
                      }}
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
                  <p className="mt-2">Loading doctors...</p>
                </div>
              ) : doctors.length === 0 ? (
                <div className="admin-empty-state">
                  <i className="bi bi-inbox"></i>
                  <p className="mt-2">No doctors found</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="admin-table table mb-0 align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>ID</th>
                        <th>Full Name</th>
                        <th>Specialty</th>
                        <th>Clinic</th>
                        <th>Fee</th>
                        <th>Status</th>
                        <th>Verified</th>
                        <th>Rating</th>
                        <th className="text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doctors.map((doctor) => (
                        <tr key={doctor.doctorId}>
                          <td><strong>{doctor.doctorId.substring(0, 8)}</strong></td>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-2" style={{ width: "35px", height: "35px", overflow: 'hidden' }}>
                                {getAvatarUrl(doctor.avatarUrl) ? (
                                  <img src={getAvatarUrl(doctor.avatarUrl)} alt={doctor.fullName} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                                ) : (
                                  doctor.fullName.charAt(0)
                                )}
                              </div>
                              {doctor.fullName}
                            </div>
                          </td>
                          <td>{doctor.specialty}</td>
                          <td>{doctor.clinicName || '—'}</td>
                          <td>
                            {doctor.consultationFee
                              ? `$${Number(doctor.consultationFee).toFixed(2)}`
                              : '—'}
                          </td>
                          <td>
                            <span className={`badge ${getStatusBadgeClass(doctor.status)}`}>
                              {doctor.status}
                            </span>
                          </td>
                          <td>
                            {doctor.verified ? (
                              <span className="badge bg-success">
                                <i className="bi bi-patch-check-fill me-1"></i>Verified
                              </span>
                            ) : (
                              <span className="badge bg-warning text-dark">
                                <i className="bi bi-clock me-1"></i>Pending
                              </span>
                            )}
                          </td>
                          <td>
                            {doctor.rating ? (
                              <span>
                                <i className="bi bi-star-fill text-warning"></i> {doctor.rating.toFixed(1)}
                              </span>
                            ) : 'N/A'}
                          </td>
                          <td className="text-center">
                            <div className="admin-btn-group">
                              <button
                                className="btn btn-outline-slate btn-sm"
                                title="View Details"
                                onClick={() => handleViewDoctor(doctor)}
                              >
                                <i className="bi bi-eye"></i>
                              </button>
                              <button
                                className="btn btn-outline-info btn-sm"
                                title="Edit Doctor Info"
                                onClick={() => handleEditDoctor(doctor)}
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button
                                className="btn btn-outline-warning btn-sm"
                                title="Change Status"
                                onClick={() => handleChangeStatus(doctor)}
                              >
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

        {/* Pagination (works for both views) */}
        {!loading && doctors.length > 0 && (
          <div className="card-footer bg-white">
            <div className="d-flex justify-content-between align-items-center">
              <span className="text-muted" style={{ fontSize: '13px' }}>
                Page <strong style={{ color: 'var(--admin-text)' }}>{pagination.pageNumber}</strong> of <strong style={{ color: 'var(--admin-text)' }}>{pagination.totalPages}</strong> • <strong style={{ color: 'var(--admin-text)' }}>{pagination.totalCount}</strong> total doctors
              </span>
              <nav>
                <ul className="pagination mb-0">
                  <li className={`page-item ${pagination.pageNumber === 1 ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => handlePageChange(pagination.pageNumber - 1)}
                      disabled={pagination.pageNumber === 1}
                    >
                      Previous
                    </button>
                  </li>
                  {(() => {
                    const pageNumbers = [];
                    const totalPages = pagination.totalPages;
                    const currentPage = pagination.pageNumber;

                    if (totalPages <= 7) {
                      for (let i = 1; i <= totalPages; i++) {
                        pageNumbers.push(i);
                      }
                    } else {
                      pageNumbers.push(1);

                      if (currentPage > 3) {
                        pageNumbers.push('...');
                      }

                      const start = Math.max(2, currentPage - 1);
                      const end = Math.min(totalPages - 1, currentPage + 1);

                      for (let i = start; i <= end; i++) {
                        if (!pageNumbers.includes(i)) {
                          pageNumbers.push(i);
                        }
                      }

                      if (currentPage < totalPages - 2) {
                        pageNumbers.push('...');
                      }

                      if (!pageNumbers.includes(totalPages)) {
                        pageNumbers.push(totalPages);
                      }
                    }

                    return pageNumbers.map((page, index) => {
                      if (page === '...') {
                        return (
                          <li key={`ellipsis-${index}`} className="page-item disabled">
                            <span className="page-link">...</span>
                          </li>
                        );
                      }
                      return (
                        <li
                          key={page}
                          className={`page-item ${pagination.pageNumber === page ? 'active' : ''}`}
                        >
                          <button
                            className="page-link"
                            onClick={() => handlePageChange(page)}
                          >
                            {page}
                          </button>
                        </li>
                      );
                    });
                  })()}
                  <li className={`page-item ${pagination.pageNumber === pagination.totalPages ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => handlePageChange(pagination.pageNumber + 1)}
                      disabled={pagination.pageNumber === pagination.totalPages}
                    >
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        )}

        {/* View Doctor Details Modal */}
        {showViewModal && selectedDoctor && (
          <div className="modal show d-block admin-modal-backdrop" tabIndex="-1">
            <div className="modal-dialog modal-lg modal-dialog-scrollable">
              <div className="modal-content" style={{ border: 'none', boxShadow: 'var(--shadow-lg)' }}>
                <div className="modal-header admin-modal-header primary" style={{ borderBottom: 'none' }}>
                  <h5 className="modal-title">
                    <i className="bi bi-person-badge me-2"></i>
                    Doctor Details
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setShowViewModal(false)}
                  ></button>
                </div>
                <div className="modal-body admin-modal-body" style={{ backgroundColor: 'var(--admin-bg)', padding: '20px' }}>
                  {/* Doctor Header Card */}
                  <div className="admin-card mb-3" style={{
                    background: 'linear-gradient(135deg, var(--admin-primary-dark) 0%, var(--admin-primary) 100%)',
                    color: 'white',
                    padding: '16px 20px'
                  }}>
                    <div className="d-flex align-items-center gap-3">
                      <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: getAvatarUrl(selectedDoctor.avatarUrl) ? 'transparent' : 'rgba(255, 255, 255, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        fontWeight: '700',
                        border: '2px solid rgba(255, 255, 255, 0.3)',
                        overflow: 'hidden',
                        flexShrink: 0
                      }}>
                        {getAvatarUrl(selectedDoctor.avatarUrl) ? (
                          <img src={getAvatarUrl(selectedDoctor.avatarUrl)} alt={selectedDoctor.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          selectedDoctor.fullName.charAt(0)
                        )}
                      </div>
                      <div className="flex-grow-1">
                        <h5 className="mb-1" style={{ fontWeight: '700' }}>Dr. {selectedDoctor.fullName}</h5>
                        <div className="d-flex flex-wrap gap-2" style={{ fontSize: '13px', opacity: 0.9 }}>
                          <span><i className="bi bi-envelope me-1"></i>{selectedDoctor.email}</span>
                          <span><i className="bi bi-telephone me-1"></i>{selectedDoctor.phone || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="d-flex flex-column gap-1 text-end">
                        <span className={`badge ${getStatusBadgeClass(selectedDoctor.status)}`} style={{ fontSize: '12px' }}>
                          {selectedDoctor.status}
                        </span>
                        {selectedDoctor.rating && (
                          <span style={{ fontSize: '13px', fontWeight: '600' }}>
                            <i className="bi bi-star-fill me-1"></i>{selectedDoctor.rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick Stats Row */}
                  <div className="row g-2 mb-3">
                    <div className="col-3">
                      <div className="text-center p-2" style={{ background: '#f0fdf4', borderRadius: '8px' }}>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#16a34a' }}>
                          {selectedDoctor.yearsOfExperience || 0}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Years Exp.</div>
                      </div>
                    </div>
                    <div className="col-3">
                      <div className="text-center p-2" style={{ background: '#eff6ff', borderRadius: '8px' }}>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#2563eb' }}>
                          {selectedDoctor.totalConsultations || 0}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Consults</div>
                      </div>
                    </div>
                    <div className="col-3">
                      <div className="text-center p-2" style={{ background: '#fef3c7', borderRadius: '8px' }}>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#d97706' }}>
                          {selectedDoctor.totalReviews || 0}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Reviews</div>
                      </div>
                    </div>
                    <div className="col-3">
                      <div className="text-center p-2" style={{ background: '#f0fdf9', borderRadius: '8px' }}>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#00a08b' }}>
                          ${Number(selectedDoctor.consultationFee || 0).toFixed(0)}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Fee</div>
                      </div>
                    </div>
                  </div>

                  {/* Professional Info */}
                  <div className="admin-card mb-3" style={{ padding: '16px' }}>
                    <h6 style={{ fontSize: '13px', fontWeight: '600', color: '#00a08b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="bi bi-briefcase"></i> Professional Information
                    </h6>
                    <div className="row g-2">
                      <div className="col-6">
                        <div style={{ fontSize: '12px', color: '#64748b' }}>Specialty</div>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#0f172a' }}>{selectedDoctor.specialty || 'N/A'}</div>
                      </div>
                      <div className="col-6">
                        <div style={{ fontSize: '12px', color: '#64748b' }}>Languages</div>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#0f172a' }}>{selectedDoctor.languageSpoken || 'N/A'}</div>
                      </div>
                      <div className="col-12 mt-2">
                        <div style={{ fontSize: '12px', color: '#64748b' }}>Qualifications</div>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#0f172a' }}>{selectedDoctor.qualifications || 'N/A'}</div>
                      </div>
                      {selectedDoctor.bio && (
                        <div className="col-12 mt-2">
                          <div style={{ fontSize: '12px', color: '#64748b' }}>Biography</div>
                          <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>{selectedDoctor.bio}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Clinic & Consultation */}
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <div className="admin-card h-100" style={{ padding: '16px' }}>
                        <h6 style={{ fontSize: '13px', fontWeight: '600', color: '#00a08b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <i className="bi bi-hospital"></i> Clinic
                        </h6>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>Name</div>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#0f172a', marginBottom: '8px' }}>{selectedDoctor.clinicName || 'Not specified'}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>Address</div>
                        <div style={{ fontSize: '13px', color: '#475569' }}>{selectedDoctor.clinicAddress || selectedDoctor.location || 'Not specified'}</div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="admin-card h-100" style={{ padding: '16px' }}>
                        <h6 style={{ fontSize: '13px', fontWeight: '600', color: '#00a08b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <i className="bi bi-headset"></i> Consultation Types
                        </h6>
                        <div className="d-flex flex-wrap gap-2">
                          <span className={`badge ${selectedDoctor.services?.includes('ONLINE') ? 'bg-success' : 'bg-secondary'}`} style={{ fontSize: '12px' }}>
                            <i className="bi bi-globe me-1"></i>Online
                          </span>
                          <span className={`badge ${selectedDoctor.services?.includes('HOME_VISIT') ? 'bg-success' : 'bg-secondary'}`} style={{ fontSize: '12px' }}>
                            <i className="bi bi-house-heart me-1"></i>Home Visit
                          </span>
                        </div>
                        {(selectedDoctor.consultationHours || selectedDoctor.availableDays) && (
                          <div className="mt-2 pt-2" style={{ borderTop: '1px solid #e2e8f0' }}>
                            {selectedDoctor.consultationHours && (
                              <div style={{ fontSize: '12px', color: '#475569' }}>
                                <i className="bi bi-clock me-1"></i>{selectedDoctor.consultationHours}
                              </div>
                            )}
                            {selectedDoctor.availableDays && (
                              <div style={{ fontSize: '12px', color: '#475569' }}>
                                <i className="bi bi-calendar3 me-1"></i>{selectedDoctor.availableDays}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Finance Info - Limited view for Admin */}
                  <div className="admin-card" style={{ padding: '16px' }}>
                    <h6 style={{ fontSize: '13px', fontWeight: '600', color: '#00a08b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="bi bi-wallet2"></i> Finance & Payment
                      <span className="badge bg-secondary ms-2" style={{fontSize: '10px', fontWeight: 'normal'}}>Summary</span>
                    </h6>
                    <div className="row g-3">
                      <div className="col-md-4">
                        <div className="d-flex justify-content-between align-items-center p-2" style={{ background: '#f0fdf4', borderRadius: '6px' }}>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>Total Earnings</span>
                          <span style={{ fontSize: '14px', fontWeight: '600', color: '#16a34a' }}>${Number(selectedDoctor.totalEarnings || 0).toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="d-flex justify-content-between align-items-center p-2" style={{ background: '#fef3c7', borderRadius: '6px' }}>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>Pending</span>
                          <span style={{ fontSize: '14px', fontWeight: '600', color: '#d97706' }}>${Number(selectedDoctor.pendingSettlement || 0).toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="d-flex justify-content-between align-items-center p-2" style={{ background: '#f8fafc', borderRadius: '6px' }}>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>Tier</span>
                          <span className={`badge ${selectedDoctor.commissionTier === 'VIP' ? 'bg-warning text-dark' : selectedDoctor.commissionTier === 'PREMIUM' ? 'bg-info' : 'bg-secondary'}`} style={{ fontSize: '11px' }}>
                            {selectedDoctor.commissionTier || 'STANDARD'}
                          </span>
                        </div>
                      </div>
                      <div className="col-12">
                        <div className="d-flex align-items-center gap-2 pt-2 text-muted" style={{ borderTop: '1px solid #e2e8f0', fontSize: '12px' }}>
                          <i className="bi bi-shield-lock"></i>
                          <span>Payment details (bank account, PayPal) are protected and managed by the doctor.</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Account Info Footer */}
                  <div className="d-flex justify-content-between align-items-center mt-3 pt-2" style={{ borderTop: '1px solid #e2e8f0', fontSize: '12px', color: '#94a3b8' }}>
                    <span><i className="bi bi-calendar-plus me-1"></i>Registered: {formatDate(selectedDoctor.createdAt)}</span>
                    <span>ID: {selectedDoctor.doctorId}</span>
                  </div>
                </div>
                <div className="admin-modal-footer">
                  <button
                    type="button"
                    className="admin-btn-modal secondary"
                    onClick={() => setShowViewModal(false)}
                  >
                    <i className="bi bi-x-circle"></i>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Doctor Modal */}
        {showEditModal && selectedDoctor && (
          <div className="modal show d-block admin-modal-backdrop" tabIndex="-1">
            <div className="modal-dialog modal-lg">
              <div className="modal-content" style={{ border: 'none', boxShadow: 'var(--shadow-lg)' }}>
                <div className="modal-header admin-modal-header info" style={{ borderBottom: 'none' }}>
                  <h5 className="modal-title">
                    <i className="bi bi-pencil-square me-2"></i>
                    Edit Doctor Information
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setShowEditModal(false)}
                  ></button>
                </div>
                <form onSubmit={handleUpdateDoctor}>
                  <div className="modal-body admin-modal-body" style={{ backgroundColor: 'var(--admin-bg)' }}>
                    {/* Personal & Contact */}
                    <div className="admin-modal-section">
                      <h6 className="admin-modal-section-title info">
                        <i className="bi bi-person-circle"></i>
                        Personal Information
                      </h6>
                      <div className="row">
                        <div className="col-md-6 mb-3">
                          <label className="admin-form-label">Full Name <span className="text-danger">*</span></label>
                          <input
                            type="text"
                            className="form-control admin-form-control"
                            value={editForm.fullName}
                            onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                            required
                          />
                        </div>
                        <div className="col-md-6 mb-3">
                          <label className="admin-form-label">Phone Number <span className="text-danger">*</span></label>
                          <input
                            type="tel"
                            className="form-control admin-form-control"
                            value={editForm.phoneNumber}
                            onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      <div className="row">
                        <div className="col-md-6 mb-3">
                          <label className="admin-form-label">Location</label>
                          <input
                            type="text"
                            className="form-control admin-form-control"
                            value={editForm.location}
                            onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                            placeholder="Enter location/city"
                          />
                        </div>
                        <div className="col-md-6 mb-3">
                          <label className="admin-form-label">Languages Spoken</label>
                          <input
                            type="text"
                            className="form-control admin-form-control"
                            value={editForm.languageSpoken}
                            onChange={(e) => setEditForm({ ...editForm, languageSpoken: e.target.value })}
                            placeholder="e.g., English, Vietnamese"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Professional Information */}
                    <div className="admin-modal-section">
                      <h6 className="admin-modal-section-title info">
                        <i className="bi bi-briefcase"></i>
                        Professional Information
                      </h6>
                      <div className="row">
                        <div className="col-md-6 mb-3">
                          <label className="admin-form-label">Specialty <span className="text-danger">*</span></label>
                          <select
                            className="form-select admin-form-control"
                            value={editForm.specialty}
                            onChange={(e) => setEditForm({ ...editForm, specialty: e.target.value })}
                            required
                          >
                            <option value="">Select Specialty</option>
                            {specialties.map(spec => (
                              <option key={spec.specialtyId} value={spec.name}>
                                {spec.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-md-6 mb-3">
                          <label className="admin-form-label">Years of Experience <span className="text-danger">*</span></label>
                          <input
                            type="number"
                            className="form-control admin-form-control"
                            value={editForm.yearsOfExperience}
                            onChange={(e) => setEditForm({ ...editForm, yearsOfExperience: e.target.value })}
                            placeholder="e.g., 5"
                            min="0"
                            required
                          />
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="admin-form-label">Qualifications <span className="text-danger">*</span></label>
                        <textarea
                          className="form-control admin-form-control"
                          rows="2"
                          value={editForm.qualifications}
                          onChange={(e) => setEditForm({ ...editForm, qualifications: e.target.value })}
                          placeholder="e.g., MD, MBBS, Board Certified..."
                          required
                        ></textarea>
                      </div>
                    </div>
                  </div>
                  <div className="admin-modal-footer">
                    <button
                      type="button"
                      className="admin-btn-modal secondary"
                      onClick={() => setShowEditModal(false)}
                    >
                      <i className="bi bi-x-circle"></i>
                      Cancel
                    </button>
                    <button type="submit" className="admin-btn-modal success">
                      <i className="bi bi-check-circle"></i>
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Change Status Modal - Enhanced Popup */}
        {showStatusModal && selectedDoctor && (
          <div className="admin-modal-overlay" onClick={() => setShowStatusModal(false)}>
            <div className="admin-modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
              <div className="admin-modal-content">
                {/* Header */}
                <div className="admin-modal-header primary">
                  <h5>
                    <i className="bi bi-shield-check me-2"></i>
                    Update Doctor Status
                  </h5>
                  <button
                    type="button"
                    className="admin-modal-close"
                    onClick={() => setShowStatusModal(false)}
                  >
                    <i className="bi bi-x-lg"></i>
                  </button>
                </div>

                {/* Body */}
                <div className="admin-modal-body">
                  {/* Doctor Info Card */}
                  <div style={{
                    background: 'linear-gradient(135deg, #f0fdf9 0%, #f0fdf9 100%)',
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid #bae6fd',
                    marginBottom: '20px'
                  }}>
                    <div className="d-flex align-items-center gap-3">
                      <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center"
                        style={{ width: "50px", height: "50px", fontSize: "20px", fontWeight: "600", overflow: "hidden" }}>
                        {getAvatarUrl(selectedDoctor.avatarUrl) ? (
                          <img src={getAvatarUrl(selectedDoctor.avatarUrl)} alt={selectedDoctor.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          selectedDoctor.fullName.charAt(0)
                        )}
                      </div>
                      <div>
                        <h6 className="mb-1" style={{ color: '#0f172a', fontWeight: '600' }}>
                          Dr. {selectedDoctor.fullName}
                        </h6>
                        <p className="mb-0" style={{ fontSize: '13px', color: '#64748b' }}>
                          <i className="bi bi-envelope me-1"></i>
                          {selectedDoctor.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Current Status */}
                  <div className="mb-4">
                    <label className="admin-form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="bi bi-info-circle" style={{ color: '#00a08b' }}></i>
                      Current Status
                    </label>
                    <div style={{
                      padding: '12px 16px',
                      background: 'white',
                      border: '2px dashed #e0f2fe',
                      borderRadius: '8px',
                      display: 'inline-block'
                    }}>
                      <span className={`badge ${getStatusBadgeClass(selectedDoctor.status)}`}
                        style={{ fontSize: '14px', padding: '8px 16px' }}>
                        <i className="bi bi-circle-fill me-2" style={{ fontSize: '8px' }}></i>
                        {selectedDoctor.status}
                      </span>
                    </div>
                  </div>

                  {/* Arrow Indicator */}
                  <div className="text-center mb-4">
                    <i className="bi bi-arrow-down-circle-fill" style={{ fontSize: '24px', color: '#00a08b' }}></i>
                  </div>

                  {/* New Status Selection */}
                  <div className="mb-4">
                    <label className="admin-form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="bi bi-pencil-square" style={{ color: '#00a08b' }}></i>
                      Select New Status
                    </label>
                    <select
                      className="form-select admin-form-control"
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      style={{
                        fontSize: '14px',
                        padding: '12px 16px',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="Active">🟢 Active - Full Access</option>
                      <option value="Inactive">⚪ Inactive - Limited Access</option>
                      <option value="Suspended">🟡 Suspended - Temporarily Blocked</option>
                      <option value="Banned">🔴 Banned - Permanently Blocked</option>
                    </select>
                  </div>

                  {/* Status Description */}
                  <div style={{
                    background: newStatus === 'Active' ? '#f0fdf9' :
                      newStatus === 'Suspended' ? '#fffbeb' :
                        newStatus === 'Banned' ? '#fef2f2' : '#f8fafc',
                    padding: '14px 16px',
                    borderRadius: '8px',
                    border: `1px solid ${newStatus === 'Active' ? '#b2ece3' :
                      newStatus === 'Suspended' ? '#fde68a' :
                        newStatus === 'Banned' ? '#fecaca' : '#e0f2fe'
                      }`
                  }}>
                    <div className="d-flex align-items-start gap-2">
                      <i className={`bi ${newStatus === 'Active' ? 'bi-check-circle-fill text-success' :
                        newStatus === 'Suspended' ? 'bi-exclamation-triangle-fill text-warning' :
                          newStatus === 'Banned' ? 'bi-x-circle-fill text-danger' :
                            'bi-info-circle-fill text-info'
                        }`} style={{ fontSize: '16px', marginTop: '2px' }}></i>
                      <div>
                        <p className="mb-1" style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>
                          {newStatus === 'Active' && 'Doctor will have full system access'}
                          {newStatus === 'Inactive' && 'Doctor will have limited system access'}
                          {newStatus === 'Suspended' && 'Doctor will be temporarily blocked from the system'}
                          {newStatus === 'Banned' && 'Doctor will be permanently banned from the system'}
                        </p>
                        <p className="mb-0" style={{ fontSize: '12px', color: '#64748b' }}>
                          This change will take effect immediately after confirmation.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Reason Input */}
                  <div className="mt-4">
                    <label className="admin-form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="bi bi-chat-left-text" style={{ color: '#00a08b' }}></i>
                      Reason for Status Change <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className="form-control admin-form-control"
                      value={statusReason}
                      onChange={(e) => setStatusReason(e.target.value)}
                      placeholder="Please provide a reason for this status change..."
                      rows={3}
                      style={{ fontSize: '14px', resize: 'none' }}
                    />
                    <small className="text-muted">This reason will be recorded in the audit log.</small>
                  </div>
                </div>

                {/* Footer */}
                <div className="admin-modal-footer">
                  <button
                    type="button"
                    className="admin-btn-modal secondary"
                    onClick={() => setShowStatusModal(false)}
                  >
                    <i className="bi bi-x-circle"></i>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="admin-btn-modal primary"
                    onClick={handleUpdateStatus}
                    style={{ minWidth: '140px' }}
                  >
                    <i className="bi bi-check-circle"></i>
                    Confirm Update
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <Toast
        show={toast.show}
        onClose={hideToast}
        title={toast.title}
        message={toast.message}
        type={toast.type}
        duration={toast.duration}
      />
    </NavbarAdmin>
  );
}
