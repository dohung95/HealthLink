import React, { useState, useEffect } from "react";
import NavbarAdmin from "./NavbarAdmin";
import { doctorsApi } from "../../../services/adminApi";
import Toast from "./Toast";
import useToast from "../useToast";
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [successMessage, setSuccessMessage] = useState({ title: '', message: '', email: '' });

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

  // Create form state
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    fullName: '',
    phoneNumber: '',
    specialty: '',
    qualifications: '',
    yearsOfExperience: '',
    languageSpoken: '',
    location: ''
  });

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
      // Prepare data according to UpdateDoctorAdminDto (using PascalCase to match backend)
      const updateData = {
        FullName: editForm.fullName,
        PhoneNumber: editForm.phoneNumber,
        Specialty: editForm.specialty,
        Qualifications: editForm.qualifications,
        YearsOfExperience: editForm.yearsOfExperience && editForm.yearsOfExperience.trim() !== ''
          ? parseInt(editForm.yearsOfExperience)
          : null,
        LanguageSpoken: editForm.languageSpoken,
        Location: editForm.location
      };

      await doctorsApi.update(selectedDoctor.doctorID, updateData);

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

  // Validate password strength
  const validatePassword = (password) => {
    const minLength = password.length >= 6;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[@$!%*?&]/.test(password);

    return {
      isValid: minLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar,
      errors: {
        minLength,
        hasUpperCase,
        hasLowerCase,
        hasNumber,
        hasSpecialChar
      }
    };
  };

  // Handle create doctor
  const handleCreateDoctor = async (e) => {
    e.preventDefault();

    // Client-side validation
    const passwordValidation = validatePassword(createForm.password);
    if (!passwordValidation.isValid) {
      showToast({
        title: 'Invalid Password',
        message: 'Password must contain at least:\n- 6 characters\n- One uppercase letter\n- One lowercase letter\n- One number\n- One special character (@$!%*?&)',
        type: 'warning',
        duration: 6000
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(createForm.email)) {
      showToast({
        title: 'Invalid Email',
        message: 'Please enter a valid email address',
        type: 'warning',
        duration: 4000
      });
      return;
    }

    try {
      // Prepare data according to CreateDoctorAdminDto (using PascalCase to match backend)
      const createData = {
        Email: createForm.email,
        Password: createForm.password,
        FullName: createForm.fullName,
        PhoneNumber: createForm.phoneNumber,
        Specialty: createForm.specialty,
        Qualifications: createForm.qualifications,
        YearsOfExperience: createForm.yearsOfExperience ? parseInt(createForm.yearsOfExperience) : null,
        LanguageSpoken: createForm.languageSpoken,
        Location: createForm.location
      };

      console.log('Sending create data:', createData);

      const response = await doctorsApi.create(createData);
      console.log('Create response:', response);

      // Show success modal with email confirmation info
      setSuccessMessage({
        title: 'Doctor Account Created Successfully!',
        message: response.message || 'A confirmation email has been sent to the doctor\'s email address.',
        email: createForm.email
      });

      setShowCreateModal(false);
      setShowSuccessModal(true);

      // Reset form
      setCreateForm({
        email: '',
        password: '',
        fullName: '',
        phoneNumber: '',
        specialty: '',
        qualifications: '',
        yearsOfExperience: '',
        languageSpoken: '',
        location: ''
      });
      fetchDoctors();
    } catch (err) {
      console.error('Full error object:', err);
      console.error('Error response:', err.response);
      console.error('Error data:', err.response?.data);

      // Handle validation errors
      if (err.response?.data?.details) {
        const details = err.response.data.details;
        let errorMessage = 'Validation failed:\n\n';

        if (typeof details === 'object') {
          Object.keys(details).forEach(key => {
            if (Array.isArray(details[key])) {
              details[key].forEach(msg => {
                errorMessage += `- ${msg}\n`;
              });
            } else {
              errorMessage += `- ${details[key]}\n`;
            }
          });
        } else {
          errorMessage = details;
        }

        showToast({
          title: 'Validation Error',
          message: errorMessage,
          type: 'error',
          duration: 6000
        });
      } else {
        const errorMessage = err.response?.data?.error || err.message || 'Failed to create doctor';
        showToast({
          title: 'Create Failed',
          message: errorMessage,
          type: 'error',
          duration: 5000
        });
      }
    }
  };

  // Handle change status
  const handleChangeStatus = (doctor) => {
    setSelectedDoctor(doctor);
    setNewStatus(doctor.status);
    setShowStatusModal(true);
  };

  // Handle update status
  const handleUpdateStatus = async () => {
    try {
      await doctorsApi.updateStatus(selectedDoctor.doctorID, newStatus);

      // Update the doctor list immediately without refetching
      setDoctors(prevDoctors =>
        prevDoctors.map(doctor =>
          doctor.doctorID === selectedDoctor.doctorID
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
            <div className="d-flex gap-2">
              <button
                className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => toggleViewMode('grid')}
                title="Grid View"
              >
                <i className="bi bi-grid-3x3-gap"></i>
                Grid
              </button>
              <button
                className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => toggleViewMode('table')}
                title="Table View"
              >
                <i className="bi bi-table"></i>
                Table
              </button>
              <button
                className="admin-btn-add"
                onClick={() => setShowCreateModal(true)}
              >
                <i className="bi bi-plus-circle-fill"></i>
                <span>Add New Doctor</span>
              </button>
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

        {/* Search and Filter */}
        <div className="admin-card mb-4">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="d-flex align-items-center" style={{ padding: "5px 10px" }}>
                <i className="bi bi-funnel me-2" style={{ color: 'var(--admin-text-light)' }}></i>
                <h6 className="mb-0" style={{ color: 'var(--admin-text-light)', fontSize: '13px', fontWeight: 600 }}>SEARCH & FILTERS</h6>
              </div>
              <div style={{ padding: "15px 5px 0 5px" }}>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => {
                    setFilters({ searchTerm: '', specialty: '', sortBy: 'newest' });
                    setPagination({ ...pagination, pageNumber: 1 });
                  }}
                  style={{ fontSize: '12px' }}
                >
                  <i className="bi bi-x-circle me-1"></i>
                  Clear Filters
                </button>
              </div>
            </div>
            <div className="row g-3">
              <div className="col-md-6" style={{ padding: "0 0 10px 20px" }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by name, email, specialty..."
                  value={filters.searchTerm}
                  onChange={handleSearch}
                />
              </div>
              <div className="col-md-3">
                <select
                  className="form-select"
                  value={filters.specialty}
                  onChange={handleSpecialtyFilter}
                >
                  <option value="">All Specialties</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Dermatology">Dermatology</option>
                  <option value="Neurology">Neurology</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="Psychiatry">Psychiatry</option>
                  <option value="General Practice">General Practice</option>
                </select>
              </div>
              <div className="col-md-3" style={{ padding: "0 20px 0 0" }}>
                <select
                  className="form-select"
                  value={filters.sortBy}
                  onChange={handleSort}
                >
                  <option value="newest">Sort by: Newest</option>
                  <option value="oldest">Sort by: Oldest</option>
                  <option value="name-asc">Sort by: Name A-Z</option>
                  <option value="name-desc">Sort by: Name Z-A</option>
                </select>
              </div>
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
                  key={doctor.doctorID}
                  className="doctor-card"
                  onClick={() => handleViewDoctor(doctor)}
                >
                  <div className="card-header-section">
                    <div className="card-avatar-container">
                      <div className={`card-avatar ${getAvatarGradient(doctor.fullName)}`}>
                        {doctor.fullName.charAt(0)}
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
                    <span className={`status-badge ${getStatusBadgeCardClass(doctor.status)}`}>
                      {doctor.status}
                    </span>
                  </div>

                  <div className="card-details">
                    <div className="card-detail-item">
                      <i className="bi bi-envelope"></i>
                      <span>{doctor.email}</span>
                    </div>
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
                          <span className="rating-number">{doctor.rating.toFixed(1)}</span>
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
                        <th>Experience</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Rating</th>
                        <th className="text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doctors.map((doctor) => (
                        <tr key={doctor.doctorID}>
                          <td><strong>{doctor.doctorID.substring(0, 8)}</strong></td>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-2" style={{ width: "35px", height: "35px" }}>
                                {doctor.fullName.charAt(0)}
                              </div>
                              {doctor.fullName}
                            </div>
                          </td>
                          <td>{doctor.specialty}</td>
                          <td>{doctor.yearsOfExperience ? `${doctor.yearsOfExperience} years` : 'N/A'}</td>
                          <td>{doctor.email}</td>
                          <td>
                            <span className={`badge ${getStatusBadgeClass(doctor.status)}`}>
                              {doctor.status}
                            </span>
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
            <div className="modal-dialog modal-xl modal-dialog-scrollable">
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
                <div className="modal-body admin-modal-body" style={{ backgroundColor: 'var(--admin-bg)' }}>
                  {/* Doctor Header Card - Highlighted */}
                  <div className="admin-card mb-4" style={{
                    background: 'linear-gradient(135deg, var(--admin-primary-dark) 0%, var(--admin-primary) 100%)',
                    color: 'white',
                    padding: 'var(--spacing-lg)'
                  }}>
                    <div className="row align-items-center">
                      <div className="col-auto">
                        <div style={{
                          width: '80px',
                          height: '80px',
                          borderRadius: 'var(--radius-full)',
                          background: 'rgba(255, 255, 255, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '32px',
                          fontWeight: '700',
                          border: '3px solid rgba(255, 255, 255, 0.3)'
                        }}>
                          {selectedDoctor.fullName.charAt(0)}
                        </div>
                      </div>
                      <div className="col">
                        <h4 className="mb-1" style={{ fontWeight: '700', fontSize: 'var(--font-size-2xl)' }}>
                          Dr. {selectedDoctor.fullName}
                        </h4>
                        <div className="d-flex flex-wrap gap-3 mt-2" style={{ fontSize: 'var(--font-size-sm)' }}>
                          <span style={{ opacity: 0.9 }}>
                            <i className="bi bi-person-badge me-1"></i>
                            ID: {selectedDoctor.doctorID}
                          </span>
                          <span style={{ opacity: 0.9 }}>
                            <i className="bi bi-telephone me-1"></i>
                            {selectedDoctor.phoneNumber}
                          </span>
                          <span style={{ opacity: 0.9 }}>
                            <i className="bi bi-envelope me-1"></i>
                            {selectedDoctor.email}
                          </span>
                        </div>
                      </div>
                      <div className="col-auto text-end">
                        <div className="d-flex flex-column gap-2">
                          <div style={{
                            background: 'rgba(255, 255, 255, 0.2)',
                            padding: '8px 16px',
                            borderRadius: 'var(--radius-md)',
                            fontSize: 'var(--font-size-sm)',
                            fontWeight: '600'
                          }}>
                            <i className="bi bi-star-fill me-1"></i>
                            {selectedDoctor.rating ? `${selectedDoctor.rating.toFixed(1)} Rating` : 'No Rating'}
                          </div>
                          {selectedDoctor.yearsOfExperience && (
                            <div style={{
                              background: 'rgba(255, 255, 255, 0.2)',
                              padding: '8px 16px',
                              borderRadius: 'var(--radius-md)',
                              fontSize: 'var(--font-size-sm)',
                              fontWeight: '600'
                            }}>
                              <i className="bi bi-award me-1"></i>
                              {selectedDoctor.yearsOfExperience} Years Exp.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    {/* Left Column */}
                    <div className="col-lg-6">
                      {/* Professional Information */}
                      <div className="admin-modal-section">
                        <h6 className="admin-modal-section-title primary">
                          <i className="bi bi-briefcase"></i>
                          Professional Information
                        </h6>
                        <div className="admin-info-row">
                          <strong>Specialty:</strong>
                          <span>{selectedDoctor.specialty || 'N/A'}</span>
                        </div>
                        <div className="admin-info-row">
                          <strong>Qualifications:</strong>
                          <span>{selectedDoctor.qualifications || 'N/A'}</span>
                        </div>
                        <div className="admin-info-row">
                          <strong>Years of Experience:</strong>
                          <span>{selectedDoctor.yearsOfExperience || 'N/A'}</span>
                        </div>
                        <div className="admin-info-row">
                          <strong>Languages Spoken:</strong>
                          <span>{selectedDoctor.languageSpoken || 'N/A'}</span>
                        </div>
                      </div>

                      {/* Contact & Location Information */}
                      <div className="admin-modal-section">
                        <h6 className="admin-modal-section-title primary">
                          <i className="bi bi-geo-alt"></i>
                          Contact & Location
                        </h6>
                        <div className="admin-info-row">
                          <strong>Location:</strong>
                          <span>{selectedDoctor.location || 'N/A'}</span>
                        </div>
                        <div className="admin-info-row">
                          <strong>Phone Number:</strong>
                          <span>{selectedDoctor.phoneNumber || 'N/A'}</span>
                        </div>
                        <div className="admin-info-row">
                          <strong>Email:</strong>
                          <span>{selectedDoctor.email || 'N/A'}</span>
                        </div>
                      </div>

                      {/* Account Information */}
                      <div className="admin-modal-section">
                        <h6 className="admin-modal-section-title primary">
                          <i className="bi bi-shield-check"></i>
                          Account Information
                        </h6>
                        <div className="admin-info-row">
                          <strong>Status:</strong>
                          <span>
                            <span className={`badge ${getStatusBadgeClass(selectedDoctor.status)}`}>
                              {selectedDoctor.status}
                            </span>
                          </span>
                        </div>
                        <div className="admin-info-row">
                          <strong>Registration Date:</strong>
                          <span>{formatDate(selectedDoctor.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="col-lg-6">
                      {/* Performance Metrics */}
                      <div className="admin-modal-section">
                        <h6 className="admin-modal-section-title primary">
                          <i className="bi bi-graph-up"></i>
                          Performance Metrics
                        </h6>
                        <div className="admin-info-row">
                          <strong>Overall Rating:</strong>
                          <span>
                            {selectedDoctor.rating ? (
                              <>
                                <i className="bi bi-star-fill text-warning"></i> {selectedDoctor.rating.toFixed(1)} / 5.0
                              </>
                            ) : 'No ratings yet'}
                          </span>
                        </div>
                        <div className="admin-info-row">
                          <strong>Total Consultations:</strong>
                          <span>{selectedDoctor.totalConsultations || '0'}</span>
                        </div>
                        <div className="admin-info-row">
                          <strong>Total Reviews:</strong>
                          <span>{selectedDoctor.totalReviews || '0'}</span>
                        </div>
                      </div>

                      {/* Availability */}
                      <div className="admin-modal-section">
                        <h6 className="admin-modal-section-title primary">
                          <i className="bi bi-calendar-check"></i>
                          Availability
                        </h6>
                        <div className="admin-info-row">
                          <strong>Consultation Hours:</strong>
                          <span>{selectedDoctor.consultationHours || 'Not specified'}</span>
                        </div>
                        <div className="admin-info-row">
                          <strong>Available Days:</strong>
                          <span>{selectedDoctor.availableDays || 'Not specified'}</span>
                        </div>
                      </div>

                      {/* Additional Information */}
                      <div className="admin-modal-section">
                        <h6 className="admin-modal-section-title primary">
                          <i className="bi bi-info-circle"></i>
                          Additional Information
                        </h6>
                        <div className="admin-info-row">
                          <strong>Biography:</strong>
                          <span style={{ display: 'block', marginTop: 'var(--spacing-sm)' }}>
                            {selectedDoctor.bio || 'No biography provided'}
                          </span>
                        </div>
                      </div>
                    </div>
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
            <div className="modal-dialog modal-xl" style={{ maxWidth: '95%' }}>
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
                    <div className="row">
                      {/* Left Column */}
                      <div className="col-lg-6">
                        {/* Personal Information Section */}
                        <div className="admin-modal-section">
                          <h6 className="admin-modal-section-title info">
                            <i className="bi bi-person-circle"></i>
                            Personal Information
                          </h6>
                          <div className="mb-3">
                            <label className="admin-form-label">Full Name <span className="text-danger">*</span></label>
                            <input
                              type="text"
                              className="form-control admin-form-control"
                              value={editForm.fullName}
                              onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                              required
                            />
                          </div>
                          <div className="mb-3">
                            <label className="admin-form-label">Phone Number <span className="text-danger">*</span></label>
                            <input
                              type="tel"
                              className="form-control admin-form-control"
                              value={editForm.phoneNumber}
                              onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                              required
                            />
                          </div>
                          <div className="mb-3">
                            <label className="admin-form-label">Location</label>
                            <input
                              type="text"
                              className="form-control admin-form-control"
                              value={editForm.location}
                              onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                              placeholder="Enter location/city"
                            />
                          </div>
                        </div>

                        {/* Language Information */}
                        <div className="admin-modal-section">
                          <h6 className="admin-modal-section-title info">
                            <i className="bi bi-chat-dots"></i>
                            Language
                          </h6>
                          <div className="mb-3">
                            <label className="admin-form-label">Languages Spoken</label>
                            <input
                              type="text"
                              className="form-control admin-form-control"
                              value={editForm.languageSpoken}
                              onChange={(e) => setEditForm({ ...editForm, languageSpoken: e.target.value })}
                              placeholder="e.g., English, Spanish, Vietnamese"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="col-lg-6">
                        {/* Professional Information Section */}
                        <div className="admin-modal-section">
                          <h6 className="admin-modal-section-title info">
                            <i className="bi bi-briefcase"></i>
                            Professional Information
                          </h6>
                          <div className="mb-3">
                            <label className="admin-form-label">Specialty <span className="text-danger">*</span></label>
                            <select
                              className="form-select admin-form-control"
                              value={editForm.specialty}
                              onChange={(e) => setEditForm({ ...editForm, specialty: e.target.value })}
                              required
                            >
                              <option value="">Select Specialty</option>
                              <option value="Cardiology">Cardiology</option>
                              <option value="Dermatology">Dermatology</option>
                              <option value="Neurology">Neurology</option>
                              <option value="Pediatrics">Pediatrics</option>
                              <option value="Psychiatry">Psychiatry</option>
                              <option value="General Practice">General Practice</option>
                              <option value="Orthopedics">Orthopedics</option>
                              <option value="Gynecology">Gynecology</option>
                              <option value="Oncology">Oncology</option>
                            </select>
                          </div>
                          <div className="mb-3">
                            <label className="admin-form-label">Qualifications <span className="text-danger">*</span></label>
                            <textarea
                              className="form-control admin-form-control"
                              rows="4"
                              value={editForm.qualifications}
                              onChange={(e) => setEditForm({ ...editForm, qualifications: e.target.value })}
                              placeholder="e.g., MD, MBBS, Board Certified..."
                              required
                            ></textarea>
                          </div>
                          <div className="mb-3">
                            <label className="admin-form-label">Years of Experience <span className="text-danger">*</span></label>
                            <input
                              type="number"
                              className="form-control admin-form-control"
                              value={editForm.yearsOfExperience}
                              onChange={(e) => setEditForm({ ...editForm, yearsOfExperience: e.target.value })}
                              placeholder="Enter years of experience"
                              min="0"
                              required
                            />
                          </div>
                        </div>
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
                        style={{ width: "50px", height: "50px", fontSize: "20px", fontWeight: "600" }}>
                        {selectedDoctor.fullName.charAt(0)}
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

        {/* Create Doctor Modal */}
        {showCreateModal && (
          <div className="admin-modal-overlay" onClick={() => setShowCreateModal(false)}>
            <div className="admin-modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="admin-modal-content">
                {/* Header */}
                <div className="admin-modal-header">
                  <div className="admin-modal-title-group">
                    <div className="admin-modal-icon-wrapper" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                      <i className="bi bi-person-plus-fill"></i>
                    </div>
                    <div>
                      <h3 className="admin-modal-title">Create New Doctor</h3>
                      <p className="admin-modal-subtitle">Add a new doctor to the system</p>
                    </div>
                  </div>
                  <button
                    className="admin-modal-close"
                    onClick={() => setShowCreateModal(false)}
                  >
                    <i className="bi bi-x-lg"></i>
                  </button>
                </div>

                {/* Body */}
                <form onSubmit={handleCreateDoctor}>
                  <div className="admin-modal-body" style={{ paddingTop: '20px', paddingBottom: '20px' }}>
                    <div className="row g-3">
                      {/* Account Information Section */}
                      <div className="col-12">
                        <h6 style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#00a08b',
                          margin: '0 0 12px 0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          paddingBottom: '8px',
                          borderBottom: '1px solid #e2e8f0'
                        }}>
                          <i className="bi bi-shield-lock-fill"></i>
                          Account Information
                        </h6>
                      </div>

                      <div className="col-md-6">
                        <label className="admin-form-label required">Email Address</label>
                        <input
                          type="email"
                          className="admin-form-input"
                          value={createForm.email}
                          onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                          placeholder="Enter doctor's email (e.g., john.doe@hospital.com)"
                          required
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="admin-form-label required">Password</label>
                        <input
                          type="password"
                          className="admin-form-input"
                          value={createForm.password}
                          onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                          placeholder="Min 6 chars (uppercase, number & symbol)"
                          minLength="6"
                          required
                        />
                      </div>

                      {/* Personal Information Section */}
                      <div className="col-12" style={{ marginTop: '20px' }}>
                        <h6 style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#00a08b',
                          margin: '0 0 12px 0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          paddingBottom: '8px',
                          borderBottom: '1px solid #e2e8f0'
                        }}>
                          <i className="bi bi-person-fill"></i>
                          Personal Information
                        </h6>
                      </div>

                      <div className="col-md-6">
                        <label className="admin-form-label required">Full Name</label>
                        <input
                          type="text"
                          className="admin-form-input"
                          value={createForm.fullName}
                          onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                          placeholder="Enter full name (e.g., Dr. John Smith)"
                          required
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="admin-form-label">Phone Number</label>
                        <input
                          type="tel"
                          className="admin-form-input"
                          value={createForm.phoneNumber}
                          onChange={(e) => setCreateForm({ ...createForm, phoneNumber: e.target.value })}
                          placeholder="Enter phone (e.g., +84 123 456 789)"
                        />
                      </div>

                      {/* Professional Information Section */}
                      <div className="col-12" style={{ marginTop: '20px' }}>
                        <h6 style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#00a08b',
                          margin: '0 0 12px 0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          paddingBottom: '8px',
                          borderBottom: '1px solid #e2e8f0'
                        }}>
                          <i className="bi bi-briefcase-fill"></i>
                          Professional Information
                        </h6>
                      </div>

                      <div className="col-md-6">
                        <label className="admin-form-label required">Specialty</label>
                        <input
                          type="text"
                          className="admin-form-input"
                          value={createForm.specialty}
                          onChange={(e) => setCreateForm({ ...createForm, specialty: e.target.value })}
                          placeholder="e.g., Cardiology, Neurology, Pediatrics"
                          required
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="admin-form-label required">Qualifications</label>
                        <input
                          type="text"
                          className="admin-form-input"
                          value={createForm.qualifications}
                          onChange={(e) => setCreateForm({ ...createForm, qualifications: e.target.value })}
                          placeholder="e.g., MD, PhD in Cardiology, MBBS"
                          required
                        />
                      </div>

                      <div className="col-md-12">
                        <label className="admin-form-label">Years of Experience</label>
                        <input
                          type="number"
                          className="admin-form-input"
                          value={createForm.yearsOfExperience}
                          onChange={(e) => setCreateForm({ ...createForm, yearsOfExperience: e.target.value })}
                          placeholder="Enter years of experience (e.g., 10)"
                          min="0"
                          max="100"
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="admin-form-label">Languages Spoken</label>
                        <input
                          type="text"
                          className="admin-form-input"
                          value={createForm.languageSpoken}
                          onChange={(e) => setCreateForm({ ...createForm, languageSpoken: e.target.value })}
                          placeholder="e.g., English, Vietnamese"
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="admin-form-label">Location</label>
                        <input
                          type="text"
                          className="admin-form-input"
                          value={createForm.location}
                          onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
                          placeholder="e.g., Ho Chi Minh City"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="admin-modal-footer">
                    <button
                      type="button"
                      className="admin-btn-modal secondary"
                      onClick={() => setShowCreateModal(false)}
                    >
                      <i className="bi bi-x-circle"></i>
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="admin-btn-modal primary"
                      style={{ minWidth: '140px' }}
                    >
                      <i className="bi bi-check-circle"></i>
                      Create Doctor
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Success Modal */}
        {showSuccessModal && (
          <div className="admin-modal-overlay" onClick={() => setShowSuccessModal(false)}>
            <div className="admin-modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px' }}>
              <div className="admin-modal-content">
                {/* Header */}
                <div className="admin-modal-header" style={{ borderBottom: 'none', paddingBottom: '0' }}>
                  <button
                    className="admin-modal-close"
                    onClick={() => setShowSuccessModal(false)}
                    style={{ position: 'absolute', right: '20px', top: '20px' }}
                  >
                    <i className="bi bi-x-lg"></i>
                  </button>
                </div>

                {/* Body */}
                <div className="admin-modal-body" style={{ textAlign: 'center', padding: '20px 40px 40px' }}>
                  {/* Success Icon */}
                  <div style={{
                    width: '80px',
                    height: '80px',
                    margin: '0 auto 24px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #00c4ac 0%, #059669 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 30px rgba(0, 196, 172, 0.3)'
                  }}>
                    <i className="bi bi-check-circle-fill" style={{
                      fontSize: '40px',
                      color: 'white'
                    }}></i>
                  </div>

                  {/* Title */}
                  <h3 style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    color: '#0f172a',
                    marginBottom: '12px'
                  }}>
                    {successMessage.title}
                  </h3>

                  {/* Message */}
                  <p style={{
                    fontSize: '15px',
                    color: '#64748b',
                    lineHeight: '1.6',
                    marginBottom: '24px'
                  }}>
                    {successMessage.message}
                  </p>

                  {/* Email Badge */}
                  <div style={{
                    background: '#f1f5f9',
                    padding: '16px',
                    borderRadius: '12px',
                    marginBottom: '24px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px'
                    }}>
                      <i className="bi bi-envelope-check-fill" style={{
                        fontSize: '20px',
                        color: '#667eea'
                      }}></i>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#334155'
                      }}>
                        {successMessage.email}
                      </span>
                    </div>
                  </div>

                  {/* Info Box */}
                  <div style={{
                    background: '#eff6ff',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid #bfdbfe',
                    marginBottom: '24px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'start',
                      gap: '12px',
                      textAlign: 'left'
                    }}>
                      <i className="bi bi-info-circle-fill" style={{
                        fontSize: '18px',
                        color: '#3b82f6',
                        marginTop: '2px'
                      }}></i>
                      <div>
                        <p style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#1e40af',
                          marginBottom: '6px'
                        }}>
                          What happens next?
                        </p>
                        <ul style={{
                          fontSize: '13px',
                          color: '#1e40af',
                          margin: '0',
                          paddingLeft: '20px',
                          lineHeight: '1.8'
                        }}>
                          <li>The doctor will receive a confirmation email</li>
                          <li>Status will remain <strong>"Inactive"</strong> until email is confirmed</li>
                          <li>After confirmation, status will change to <strong>"Active"</strong></li>
                          <li>Doctor can then log in and access the system</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Close Button */}
                  <button
                    onClick={() => setShowSuccessModal(false)}
                    style={{
                      width: '100%',
                      padding: '14px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                    }}
                  >
                    <i className="bi bi-check-circle me-2"></i>
                    Got it, Thanks!
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
