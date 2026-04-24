import React, { useState, useEffect } from "react";
import NavbarAdmin from "./NavbarAdmin";
import { patientsApi, medicalRecordsApi } from "../../../services/adminApi";
import Toast from "./Toast";
import useToast from "../useToast";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../Css/Admin.css";

export default function Patients() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [patients, setPatients] = useState([]);
  const { toast, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('patientsViewMode') || 'grid';
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
    sortBy: 'newest'
  });

  // Modal states
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientHealthRecords, setPatientHealthRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  // Edit form state
  const [editForm, setEditForm] = useState({
    fullName: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: '',
    email: '',
    address: '',
    city: '',
    country: '',
    bloodType: '',
    occupation: '',
    preferredLanguage: '',
    preferredContactMethod: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    medicalHistorySummary: '',
    insuranceProvider: '',
    insurancePolicyNumber: ''
  });

  // Fetch patients from API
  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await patientsApi.getAll({
        pageNumber: pagination.pageNumber,
        pageSize: pagination.pageSize,
        ...filters
      });

      setPatients(response.patients);
      setPagination({
        pageNumber: response.pageNumber,
        pageSize: response.pageSize,
        totalCount: response.totalCount,
        totalPages: response.totalPages
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch patients');
      console.error('Error fetching patients:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on component mount and when filters/pagination change
  useEffect(() => {
    fetchPatients();
  }, [pagination.pageNumber, filters]);

  // Handle search
  const handleSearch = (e) => {
    setFilters({ ...filters, searchTerm: e.target.value });
    setPagination({ ...pagination, pageNumber: 1 }); // Reset to page 1
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

  // Handle view patient details
  const handleViewPatient = async (patient) => {
    setSelectedPatient(patient);
    setShowViewModal(true);
    setLoadingRecords(true);

    try {
      const records = await medicalRecordsApi.getByPatientId(patient.patientID);
      setPatientHealthRecords(records);
    } catch (err) {
      console.error('Error fetching health records:', err);
      setPatientHealthRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  };

  // Handle edit patient
  const handleEditPatient = (patient) => {
    setSelectedPatient(patient);
    setEditForm({
      fullName: patient.fullName,
      phoneNumber: patient.phone,
      dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.split('T')[0] : '',
      gender: patient.gender || '',
      email: patient.email || '',
      address: patient.address || '',
      city: patient.city || '',
      country: patient.country || '',
      bloodType: patient.bloodType || '',
      occupation: patient.occupation || '',
      preferredLanguage: patient.preferredLanguage || '',
      preferredContactMethod: patient.preferredContactMethod || '',
      emergencyContactName: patient.emergencyContactName || '',
      emergencyContactPhone: patient.emergencyContactPhone || '',
      emergencyContactRelationship: patient.emergencyContactRelationship || '',
      medicalHistorySummary: patient.medicalHistorySummary || '',
      insuranceProvider: patient.insuranceProvider || '',
      insurancePolicyNumber: patient.insurancePolicyNumber || ''
    });
    setShowEditModal(true);
  };

  // Handle update patient
  const handleUpdatePatient = async (e) => {
    e.preventDefault();

    try {
      // Prepare data according to UpdatePatientAdminDto (using PascalCase to match backend)
      const updateData = {
        FullName: editForm.fullName,
        PhoneNumber: editForm.phoneNumber,
        DateOfBirth: editForm.dateOfBirth,
        Gender: editForm.gender,
        Address: editForm.address,
        City: editForm.city,
        Country: editForm.country,
        BloodType: editForm.bloodType,
        Occupation: editForm.occupation,
        PreferredLanguage: editForm.preferredLanguage,
        PreferredContactMethod: editForm.preferredContactMethod,
        EmergencyContactName: editForm.emergencyContactName,
        EmergencyContactPhone: editForm.emergencyContactPhone,
        EmergencyContactRelationship: editForm.emergencyContactRelationship,
        MedicalHistorySummary: editForm.medicalHistorySummary,
        InsuranceProvider: editForm.insuranceProvider,
        InsurancePolicyNumber: editForm.insurancePolicyNumber
      };

      console.log('Sending update data:', updateData);
      console.log('Patient ID:', selectedPatient.patientID);

      const response = await patientsApi.update(selectedPatient.patientID, updateData);
      console.log('Update response:', response);

      showToast({
        title: 'Success!',
        message: 'Patient information has been updated successfully',
        type: 'success'
      });
      setShowEditModal(false);
      fetchPatients();
    } catch (err) {
      console.error('Full error object:', err);
      console.error('Error response:', err.response);
      console.error('Error data:', err.response?.data);

      const errorMessage = err.response?.data?.error || err.response?.data?.details || err.message || 'Failed to update patient';
      showToast({
        title: 'Update Failed',
        message: errorMessage,
        type: 'error',
        duration: 5000
      });
    }
  };

  // Handle change status
  const handleChangeStatus = (patient) => {
    setSelectedPatient(patient);
    setNewStatus(patient.status);
    setShowStatusModal(true);
  };

  // Handle update status
  const handleUpdateStatus = async () => {
    try {
      await patientsApi.updateStatus(selectedPatient.patientID, newStatus);

      // Update the patient list immediately without refetching
      setPatients(prevPatients =>
        prevPatients.map(patient =>
          patient.patientID === selectedPatient.patientID
            ? { ...patient, status: newStatus }
            : patient
        )
      );

      setShowStatusModal(false);

      // Show success message
      showToast({
        title: 'Status Updated',
        message: 'Patient status has been updated successfully',
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
    localStorage.setItem('patientsViewMode', mode);
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

  return (
    <NavbarAdmin
      sidebarCollapsed={sidebarCollapsed}
      onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
    >
      <main className="admin-content p-4">
          {/* Patients Page Header with Visual Distinction */}
          <div className="admin-page-header-patients mb-4">
            <div className="d-flex justify-content-between align-items-start">
              <div className="admin-page-title-section">
                <div className="d-flex align-items-center gap-3 mb-2">
                  <div className="admin-page-icon-patients">
                    <i className="bi bi-person-hearts"></i>
                  </div>
                  <div>
                    <h2 className="admin-page-title mb-1">
                      Patients Management
                    </h2>
                    <div className="d-flex align-items-center gap-2">
                      <span className="admin-page-badge-patients">
                        <i className="bi bi-shield-fill-check me-1"></i>
                        Healthcare Recipients
                      </span>
                      <span className="admin-page-count">
                        {pagination.totalCount} {pagination.totalCount === 1 ? 'Patient' : 'Patients'}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="admin-page-subtitle-patients mb-0">
                  Manage patient records, health information, and medical history
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
                <div className="d-flex align-items-center" style={{padding:"5px 10px"}}>
                  <i className="bi bi-funnel me-2" style={{color: 'var(--admin-text-light)'}}></i>
                  <h6 className="mb-0" style={{color: 'var(--admin-text-light)', fontSize: '13px', fontWeight: 600}}>SEARCH & FILTERS</h6>
                </div>
                <div style={{padding:"15px 5px 0 5px"}}>
                  <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => {
                    setFilters({ searchTerm: '', status: '', sortBy: 'newest' });
                    setPagination({ ...pagination, pageNumber: 1 });
                  }}
                  style={{fontSize: '12px'}}
                >
                  <i className="bi bi-x-circle me-1"></i>
                  Clear Filters
                </button>
                </div>
              </div>
              <div className="row g-3">
                <div className="col-md-6" style={{padding:"0 0 10px 20px"}}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by name, email, phone..."
                    value={filters.searchTerm}
                    onChange={handleSearch}
                  />
                </div>
                <div className="col-md-3">
                  <select
                    className="form-select"
                    value={filters.status}
                    onChange={handleStatusFilter}
                  >
                    <option value="">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Banned">Banned</option>
                  </select>
                </div>
                <div className="col-md-3" style={{padding:"0 20px 0 0"}}>
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

          {/* Patients Display - Grid or Table */}
          {viewMode === 'grid' ? (
            /* Card Grid View */
            loading ? (
              <div className="card-grid-container">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="card-skeleton">
                    <div className="d-flex gap-3 mb-3">
                      <div className="skeleton-avatar"></div>
                      <div className="flex-1">
                        <div className="skeleton-line mb-2" style={{width: '60%'}}></div>
                        <div className="skeleton-line" style={{width: '40%'}}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : patients.length === 0 ? (
              <div className="card-grid-empty">
                <i className="bi bi-inbox"></i>
                <h4>No patients found</h4>
                <p>Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="card-grid-container">
                {patients.map((patient) => (
                  <div
                    key={patient.patientID}
                    className="patient-card"
                    onClick={() => handleViewPatient(patient)}
                  >
                    <div className="card-header-section">
                      <div className="card-avatar-container">
                        <div className={`card-avatar ${getAvatarGradient(patient.fullName)}`}>
                          {patient.fullName.charAt(0)}
                        </div>
                        <div className={`status-indicator-dot ${getStatusDotClass(patient.status)}`}></div>
                      </div>
                      <div className="card-info-section">
                        <h3 className="card-title">{patient.fullName}</h3>
                        <p className="card-subtitle">{patient.age} years • {patient.gender}</p>
                      </div>
                    </div>

                    <div className="card-badges">
                      <span className={`status-badge ${getStatusBadgeCardClass(patient.status)}`}>
                        {patient.status}
                      </span>
                    </div>

                    <div className="card-details">
                      <div className="card-detail-item">
                        <i className="bi bi-telephone"></i>
                        <span>{patient.phone}</span>
                      </div>
                      <div className="card-detail-item">
                        <i className="bi bi-envelope"></i>
                        <span>{patient.email}</span>
                      </div>
                      <div className="card-detail-item">
                        <i className="bi bi-calendar-event"></i>
                        <span><strong>Last Visit:</strong> {patient.lastVisit || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="card-footer">
                      <button
                        className="card-action-btn primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewPatient(patient);
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
                          handleEditPatient(patient);
                        }}
                        title="Edit Patient"
                      >
                        <i className="bi bi-pencil"></i>
                        Edit
                      </button>
                      <button
                        className="card-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleChangeStatus(patient);
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
                    <p className="mt-2">Loading patients...</p>
                  </div>
                ) : patients.length === 0 ? (
                  <div className="admin-empty-state">
                    <i className="bi bi-inbox"></i>
                    <p className="mt-2">No patients found</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                  <table className="admin-table table mb-0 align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>ID</th>
                        <th>Full Name</th>
                        <th>Age</th>
                        <th>Gender</th>
                        <th>Phone</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Last Visit</th>
                        <th className="text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patients.map((patient) => (
                        <tr key={patient.patientID}>
                          <td><strong>{patient.patientID.substring(0, 8)}</strong></td>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-2" style={{width: "35px", height: "35px"}}>
                                {patient.fullName.charAt(0)}
                              </div>
                              {patient.fullName}
                            </div>
                          </td>
                          <td>{patient.age}</td>
                          <td>{patient.gender}</td>
                          <td>{patient.phone}</td>
                          <td>{patient.email}</td>
                          <td>
                            <span className={`badge ${getStatusBadgeClass(patient.status)}`}>
                              {patient.status}
                            </span>
                          </td>
                          <td>{patient.lastVisit || 'N/A'}</td>
                          <td className="text-center">
                            <div className="admin-btn-group">
                              <button
                                className="btn btn-outline-slate btn-sm"
                                title="View Details & Health Records"
                                onClick={() => handleViewPatient(patient)}
                              >
                                <i className="bi bi-eye"></i>
                              </button>
                              <button
                                className="btn btn-outline-info btn-sm"
                                title="Edit Patient Info"
                                onClick={() => handleEditPatient(patient)}
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button
                                className="btn btn-outline-warning btn-sm"
                                title="Change Status"
                                onClick={() => handleChangeStatus(patient)}
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
          {!loading && patients.length > 0 && (
              <div className="card-footer bg-white">
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-muted" style={{fontSize: '13px'}}>
                    Page <strong style={{color: 'var(--admin-text)'}}>{pagination.pageNumber}</strong> of <strong style={{color: 'var(--admin-text)'}}>{pagination.totalPages}</strong> • <strong style={{color: 'var(--admin-text)'}}>{pagination.totalCount}</strong> total patients
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

          {/* View Patient Details Modal */}
          {showViewModal && selectedPatient && (
            <div className="modal show d-block admin-modal-backdrop" tabIndex="-1">
              <div className="modal-dialog modal-xl modal-dialog-scrollable">
                <div className="modal-content" style={{border: 'none', boxShadow: 'var(--shadow-lg)'}}>
                  <div className="modal-header admin-modal-header primary" style={{borderBottom: 'none'}}>
                    <h5 className="modal-title">
                      <i className="bi bi-person-circle me-2"></i>
                      Patient Details
                    </h5>
                    <button
                      type="button"
                      className="btn-close btn-close-white"
                      onClick={() => setShowViewModal(false)}
                    ></button>
                  </div>
                  <div className="modal-body admin-modal-body" style={{backgroundColor: 'var(--admin-bg)'}}>
                    {/* Patient Header Card - Highlighted */}
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
                            {selectedPatient.fullName.charAt(0)}
                          </div>
                        </div>
                        <div className="col">
                          <h4 className="mb-1" style={{fontWeight: '700', fontSize: 'var(--font-size-2xl)'}}>
                            {selectedPatient.fullName}
                          </h4>
                          <div className="d-flex flex-wrap gap-3 mt-2" style={{fontSize: 'var(--font-size-sm)'}}>
                            <span style={{opacity: 0.9}}>
                              <i className="bi bi-person-badge me-1"></i>
                              ID: {selectedPatient.patientID}
                            </span>
                            <span style={{opacity: 0.9}}>
                              <i className="bi bi-telephone me-1"></i>
                              {selectedPatient.phone}
                            </span>
                            <span style={{opacity: 0.9}}>
                              <i className="bi bi-envelope me-1"></i>
                              {selectedPatient.email}
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
                              <i className="bi bi-cake me-1"></i>
                              {selectedPatient.age} years old
                            </div>
                            {selectedPatient.gender && (
                              <div style={{
                                background: 'rgba(255, 255, 255, 0.2)',
                                padding: '8px 16px',
                                borderRadius: 'var(--radius-md)',
                                fontSize: 'var(--font-size-sm)',
                                fontWeight: '600'
                              }}>
                                <i className="bi bi-gender-ambiguous me-1"></i>
                                {selectedPatient.gender}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="row">
                      {/* Left Column */}
                      <div className="col-lg-6">
                        {/* Personal Information */}
                        <div className="admin-modal-section">
                          <h6 className="admin-modal-section-title primary">
                            <i className="bi bi-person-circle"></i>
                            Additional Information
                          </h6>
                          <div className="row">
                            <div className="col-md-6">
                              <div className="admin-info-row">
                                <strong>Date of Birth:</strong>
                                <span>{formatDate(selectedPatient.dateOfBirth)}</span>
                              </div>
                            </div>
                            <div className="col-md-6">
                              <div className="admin-info-row">
                                <strong>Blood Type:</strong>
                                <span>{selectedPatient.bloodType || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="admin-info-row">
                            <strong>Occupation:</strong>
                            <span>{selectedPatient.occupation || 'N/A'}</span>
                          </div>
                        </div>

                        {/* Address Information */}
                        <div className="admin-modal-section">
                          <h6 className="admin-modal-section-title primary">
                            <i className="bi bi-geo-alt"></i>
                            Address Information
                          </h6>
                          <div className="admin-info-row">
                            <strong>Address:</strong>
                            <span>{selectedPatient.address || 'N/A'}</span>
                          </div>
                          <div className="row">
                            <div className="col-md-6">
                              <div className="admin-info-row">
                                <strong>City:</strong>
                                <span>{selectedPatient.city || 'N/A'}</span>
                              </div>
                            </div>
                            <div className="col-md-6">
                              <div className="admin-info-row">
                                <strong>Country:</strong>
                                <span>{selectedPatient.country || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Emergency Contact */}
                        <div className="admin-modal-section">
                          <h6 className="admin-modal-section-title primary">
                            <i className="bi bi-telephone-fill"></i>
                            Emergency Contact
                          </h6>
                          <div className="admin-info-row">
                            <strong>Contact Name:</strong>
                            <span>{selectedPatient.emergencyContactName || 'N/A'}</span>
                          </div>
                          <div className="admin-info-row">
                            <strong>Contact Phone:</strong>
                            <span>{selectedPatient.emergencyContactPhone || 'N/A'}</span>
                          </div>
                          <div className="admin-info-row">
                            <strong>Relationship:</strong>
                            <span>{selectedPatient.emergencyContactRelationship || 'N/A'}</span>
                          </div>
                        </div>

                        {/* Preferences */}
                        <div className="admin-modal-section">
                          <h6 className="admin-modal-section-title primary">
                            <i className="bi bi-gear"></i>
                            Preferences
                          </h6>
                          <div className="admin-info-row">
                            <strong>Preferred Language:</strong>
                            <span>{selectedPatient.preferredLanguage || 'N/A'}</span>
                          </div>
                          <div className="admin-info-row">
                            <strong>Contact Method:</strong>
                            <span>{selectedPatient.preferredContactMethod || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="col-lg-6">
                        {/* Medical Information */}
                        <div className="admin-modal-section">
                          <h6 className="admin-modal-section-title primary">
                            <i className="bi bi-heart-pulse"></i>
                            Medical Information
                          </h6>
                          <div className="admin-info-row">
                            <strong>Medical History:</strong>
                            <span style={{display: 'block', marginTop: 'var(--spacing-sm)'}}>
                              {selectedPatient.medicalHistorySummary || 'No medical history recorded'}
                            </span>
                          </div>
                        </div>

                        {/* Insurance Information */}
                        <div className="admin-modal-section">
                          <h6 className="admin-modal-section-title primary">
                            <i className="bi bi-shield-check"></i>
                            Insurance Information
                          </h6>
                          <div className="admin-info-row">
                            <strong>Provider:</strong>
                            <span>{selectedPatient.insuranceProvider || 'N/A'}</span>
                          </div>
                          <div className="admin-info-row">
                            <strong>Policy Number:</strong>
                            <span>{selectedPatient.insurancePolicyNumber || 'N/A'}</span>
                          </div>
                        </div>

                        {/* Health Records */}
                        <div className="admin-modal-section">
                          <h6 className="admin-modal-section-title primary">
                            <i className="bi bi-file-medical"></i>
                            Health Records
                            <span className="admin-badge primary ms-2">{patientHealthRecords.length} records</span>
                          </h6>
                          {loadingRecords ? (
                            <div className="admin-loading">
                              <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                              </div>
                              <p className="mt-2">Loading health records...</p>
                            </div>
                          ) : patientHealthRecords.length === 0 ? (
                            <div className="admin-empty-state">
                              <i className="bi bi-file-medical"></i>
                              <p className="mt-2">No health records found</p>
                            </div>
                          ) : (
                            <div className="table-responsive">
                              <table className="admin-table table mb-0">
                                <thead>
                                  <tr>
                                    <th>Record ID</th>
                                    <th>Date</th>
                                    <th>Category</th>
                                    <th>Diagnosis</th>
                                    <th>Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {patientHealthRecords.map((record) => (
                                    <tr key={record.healthRecordID}>
                                      <td><strong>{record.healthRecordID}</strong></td>
                                      <td>{formatDate(record.date)}</td>
                                      <td>
                                        <span className="admin-badge primary">
                                          {record.category}
                                        </span>
                                      </td>
                                      <td>{record.diagnosis}</td>
                                      <td>
                                        <span className={`admin-badge ${record.status.toLowerCase() === 'active' ? 'success' : 'info'}`}>
                                          {record.status}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
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

          {/* Edit Patient Modal */}
          {showEditModal && selectedPatient && (
            <div className="modal show d-block admin-modal-backdrop" tabIndex="-1">
              <div className="modal-dialog modal-xl" style={{maxWidth: '95%'}}>
                <div className="modal-content" style={{border: 'none', boxShadow: 'var(--shadow-lg)'}}>
                  <div className="modal-header admin-modal-header info" style={{borderBottom: 'none'}}>
                    <h5 className="modal-title">
                      <i className="bi bi-pencil-square me-2"></i>
                      Edit Patient Information
                    </h5>
                    <button
                      type="button"
                      className="btn-close btn-close-white"
                      onClick={() => setShowEditModal(false)}
                    ></button>
                  </div>
                  <form onSubmit={handleUpdatePatient}>
                    <div className="modal-body admin-modal-body" style={{backgroundColor: 'var(--admin-bg)'}}>
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
                            <div className="row">
                              <div className="col-md-6 mb-3">
                                <label className="admin-form-label">Email <span className="text-danger">*</span></label>
                                <input
                                  type="email"
                                  className="form-control admin-form-control"
                                  value={editForm.email}
                                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                  required
                                  readOnly
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
                                <label className="admin-form-label">Date of Birth <span className="text-danger">*</span></label>
                                <input
                                  type="date"
                                  className="form-control admin-form-control"
                                  value={editForm.dateOfBirth}
                                  onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                                  required
                                />
                              </div>
                              <div className="col-md-6 mb-3">
                                <label className="admin-form-label">Gender <span className="text-danger">*</span></label>
                                <select
                                  className="form-select admin-form-control"
                                  value={editForm.gender}
                                  onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                                  required
                                >
                                  <option value="">Select Gender</option>
                                  <option value="Male">Male</option>
                                  <option value="Female">Female</option>
                                  <option value="Other">Other</option>
                                </select>
                              </div>
                            </div>
                            <div className="row">
                              <div className="col-md-6 mb-3">
                                <label className="admin-form-label">Blood Type</label>
                                <select
                                  className="form-select admin-form-control"
                                  value={editForm.bloodType}
                                  onChange={(e) => setEditForm({ ...editForm, bloodType: e.target.value })}
                                >
                                  <option value="">Select Blood Type</option>
                                  <option value="A+">A+</option>
                                  <option value="A-">A-</option>
                                  <option value="B+">B+</option>
                                  <option value="B-">B-</option>
                                  <option value="AB+">AB+</option>
                                  <option value="AB-">AB-</option>
                                  <option value="O+">O+</option>
                                  <option value="O-">O-</option>
                                </select>
                              </div>
                              <div className="col-md-6 mb-3">
                                <label className="admin-form-label">Occupation</label>
                                <input
                                  type="text"
                                  className="form-control admin-form-control"
                                  value={editForm.occupation}
                                  onChange={(e) => setEditForm({ ...editForm, occupation: e.target.value })}
                                  placeholder="Enter occupation"
                                />
                              </div>
                            </div>
                            <div className="mb-3">
                              <label className="admin-form-label">Address</label>
                              <input
                                type="text"
                                className="form-control admin-form-control"
                                value={editForm.address}
                                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                placeholder="Enter full address"
                              />
                            </div>
                            <div className="row">
                              <div className="col-md-6 mb-3">
                                <label className="admin-form-label">City</label>
                                <input
                                  type="text"
                                  className="form-control admin-form-control"
                                  value={editForm.city}
                                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                                  placeholder="Enter city"
                                />
                              </div>
                              <div className="col-md-6 mb-3">
                                <label className="admin-form-label">Country</label>
                                <input
                                  type="text"
                                  className="form-control admin-form-control"
                                  value={editForm.country}
                                  onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                                  placeholder="Enter country"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Emergency Contact Section */}
                          <div className="admin-modal-section">
                            <h6 className="admin-modal-section-title info">
                              <i className="bi bi-telephone-fill"></i>
                              Emergency Contact
                            </h6>
                            <div className="mb-3">
                              <label className="admin-form-label">Contact Name</label>
                              <input
                                type="text"
                                className="form-control admin-form-control"
                                value={editForm.emergencyContactName}
                                onChange={(e) => setEditForm({ ...editForm, emergencyContactName: e.target.value })}
                                placeholder="Enter contact name"
                              />
                            </div>
                            <div className="row">
                              <div className="col-md-6 mb-3">
                                <label className="admin-form-label">Contact Phone</label>
                                <input
                                  type="tel"
                                  className="form-control admin-form-control"
                                  value={editForm.emergencyContactPhone}
                                  onChange={(e) => setEditForm({ ...editForm, emergencyContactPhone: e.target.value })}
                                  placeholder="Enter phone"
                                />
                              </div>
                              <div className="col-md-6 mb-3">
                                <label className="admin-form-label">Relationship</label>
                                <input
                                  type="text"
                                  className="form-control admin-form-control"
                                  value={editForm.emergencyContactRelationship}
                                  onChange={(e) => setEditForm({ ...editForm, emergencyContactRelationship: e.target.value })}
                                  placeholder="e.g., Spouse, Parent"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Preferences Section */}
                          <div className="admin-modal-section">
                            <h6 className="admin-modal-section-title info">
                              <i className="bi bi-gear"></i>
                              Preferences
                            </h6>
                            <div className="row">
                              <div className="col-md-6 mb-3">
                                <label className="admin-form-label">Preferred Language</label>
                                <input
                                  type="text"
                                  className="form-control admin-form-control"
                                  value={editForm.preferredLanguage}
                                  onChange={(e) => setEditForm({ ...editForm, preferredLanguage: e.target.value })}
                                  placeholder="e.g., English"
                                />
                              </div>
                              <div className="col-md-6 mb-3">
                                <label className="admin-form-label">Contact Method</label>
                                <select
                                  className="form-select admin-form-control"
                                  value={editForm.preferredContactMethod}
                                  onChange={(e) => setEditForm({ ...editForm, preferredContactMethod: e.target.value })}
                                >
                                  <option value="">Select Method</option>
                                  <option value="Email">Email</option>
                                  <option value="Phone">Phone</option>
                                  <option value="SMS">SMS</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right Column */}
                        <div className="col-lg-6">
                          {/* Medical Information Section */}
                          <div className="admin-modal-section">
                            <h6 className="admin-modal-section-title info">
                              <i className="bi bi-heart-pulse"></i>
                              Medical Information
                            </h6>
                            <div className="mb-3">
                              <label className="admin-form-label">Medical History Summary</label>
                              <textarea
                                className="form-control admin-form-control"
                                rows="12"
                                value={editForm.medicalHistorySummary}
                                onChange={(e) => setEditForm({ ...editForm, medicalHistorySummary: e.target.value })}
                                placeholder="Enter medical history, allergies, chronic conditions..."
                              ></textarea>
                            </div>
                          </div>

                          {/* Insurance Information Section */}
                          <div className="admin-modal-section">
                            <h6 className="admin-modal-section-title info">
                              <i className="bi bi-shield-check"></i>
                              Insurance Information
                            </h6>
                            <div className="mb-3">
                              <label className="admin-form-label">Insurance Provider</label>
                              <input
                                type="text"
                                className="form-control admin-form-control"
                                value={editForm.insuranceProvider}
                                onChange={(e) => setEditForm({ ...editForm, insuranceProvider: e.target.value })}
                                placeholder="e.g., Blue Cross, Aetna"
                              />
                            </div>
                            <div className="mb-3">
                              <label className="admin-form-label">Insurance Policy Number</label>
                              <input
                                type="text"
                                className="form-control admin-form-control"
                                value={editForm.insurancePolicyNumber}
                                onChange={(e) => setEditForm({ ...editForm, insurancePolicyNumber: e.target.value })}
                                placeholder="Enter policy number"
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
          {showStatusModal && selectedPatient && (
            <div className="admin-modal-overlay" onClick={() => setShowStatusModal(false)}>
              <div className="admin-modal-container" onClick={(e) => e.stopPropagation()} style={{maxWidth: '500px'}}>
                <div className="admin-modal-content">
                  {/* Header */}
                  <div className="admin-modal-header primary">
                    <h5>
                      <i className="bi bi-shield-check me-2"></i>
                      Update Patient Status
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
                    {/* Patient Info Card */}
                    <div style={{
                      background: 'linear-gradient(135deg, #f0fdf9 0%, #f0fdf9 100%)',
                      padding: '16px',
                      borderRadius: '8px',
                      border: '1px solid #bae6fd',
                      marginBottom: '20px'
                    }}>
                      <div className="d-flex align-items-center gap-3">
                        <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center"
                             style={{width: "50px", height: "50px", fontSize: "20px", fontWeight: "600"}}>
                          {selectedPatient.fullName.charAt(0)}
                        </div>
                        <div>
                          <h6 className="mb-1" style={{color: '#0f172a', fontWeight: '600'}}>
                            {selectedPatient.fullName}
                          </h6>
                          <p className="mb-0" style={{fontSize: '13px', color: '#64748b'}}>
                            <i className="bi bi-envelope me-1"></i>
                            {selectedPatient.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Current Status */}
                    <div className="mb-4">
                      <label className="admin-form-label" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                        <i className="bi bi-info-circle" style={{color: '#00a08b'}}></i>
                        Current Status
                      </label>
                      <div style={{
                        padding: '12px 16px',
                        background: 'white',
                        border: '2px dashed #e0f2fe',
                        borderRadius: '8px',
                        display: 'inline-block'
                      }}>
                        <span className={`badge ${getStatusBadgeClass(selectedPatient.status)}`}
                              style={{fontSize: '14px', padding: '8px 16px'}}>
                          <i className="bi bi-circle-fill me-2" style={{fontSize: '8px'}}></i>
                          {selectedPatient.status}
                        </span>
                      </div>
                    </div>

                    {/* Arrow Indicator */}
                    <div className="text-center mb-4">
                      <i className="bi bi-arrow-down-circle-fill" style={{fontSize: '24px', color: '#00a08b'}}></i>
                    </div>

                    {/* New Status Selection */}
                    <div className="mb-4">
                      <label className="admin-form-label" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                        <i className="bi bi-pencil-square" style={{color: '#00a08b'}}></i>
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
                      border: `1px solid ${
                        newStatus === 'Active' ? '#b2ece3' :
                        newStatus === 'Suspended' ? '#fde68a' :
                        newStatus === 'Banned' ? '#fecaca' : '#e0f2fe'
                      }`
                    }}>
                      <div className="d-flex align-items-start gap-2">
                        <i className={`bi ${
                          newStatus === 'Active' ? 'bi-check-circle-fill text-success' :
                          newStatus === 'Suspended' ? 'bi-exclamation-triangle-fill text-warning' :
                          newStatus === 'Banned' ? 'bi-x-circle-fill text-danger' :
                          'bi-info-circle-fill text-info'
                        }`} style={{fontSize: '16px', marginTop: '2px'}}></i>
                        <div>
                          <p className="mb-1" style={{fontSize: '13px', fontWeight: '600', color: '#0f172a'}}>
                            {newStatus === 'Active' && 'Patient will have full system access'}
                            {newStatus === 'Inactive' && 'Patient will have limited system access'}
                            {newStatus === 'Suspended' && 'Patient will be temporarily blocked from the system'}
                            {newStatus === 'Banned' && 'Patient will be permanently banned from the system'}
                          </p>
                          <p className="mb-0" style={{fontSize: '12px', color: '#64748b'}}>
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
                      style={{minWidth: '140px'}}
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
