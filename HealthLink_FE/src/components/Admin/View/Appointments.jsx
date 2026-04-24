import React, { useState, useEffect } from "react";
import NavbarAdmin from "./NavbarAdmin";
import { appointmentsApi } from "../../../services/adminApi";
import Toast from "./Toast";
import useToast from "../useToast";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../Css/Admin.css";

export default function Appointments() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const { toast, showToast, hideToast } = useToast();
  const [stats, setStats] = useState({
    todayAppointments: 0,
    pendingApproval: 0,
    completed: 0,
    cancelled: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    pageNumber: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0
  });
  const [filters, setFilters] = useState({
    searchTerm: '',
    date: '',
    status: '',
    department: ''
  });

  const departments = [
    "General Internal Medicine",
    "Gastroenterology",
    "Cardiology",
    "Oncology",
    "Endocrinology",
    "Neurology",
    "Pediatrics",
    "Dermatology",
    "Orthopedics",
    "Psychiatry"
  ];

  // Modal states
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  // Edit form state
  const [editForm, setEditForm] = useState({
    appointmentDate: '',
    appointmentTime: '',
    consultationType: '',
    status: '',
    reason: '',
    notes: '',
    diagnosis: ''
  });

  // Fetch stats
  const fetchStats = async () => {
    try {
      const data = await appointmentsApi.getStats();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  // Fetch appointments
  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await appointmentsApi.getAll({
        pageNumber: pagination.pageNumber,
        pageSize: pagination.pageSize,
        ...filters
      });

      setAppointments(response.appointments);
      setPagination({
        pageNumber: response.pageNumber,
        pageSize: response.pageSize,
        totalCount: response.totalCount,
        totalPages: response.totalPages
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch appointments');
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [pagination.pageNumber, filters]);

  const handleSearch = (e) => {
    setFilters({ ...filters, searchTerm: e.target.value });
    setPagination({ ...pagination, pageNumber: 1 });
  };

  const handleDateFilter = (e) => {
    setFilters({ ...filters, date: e.target.value });
    setPagination({ ...pagination, pageNumber: 1 });
  };

  const handleStatusFilter = (e) => {
    setFilters({ ...filters, status: e.target.value });
    setPagination({ ...pagination, pageNumber: 1 });
  };

  const handleDepartmentFilter = (e) => {
    setFilters({ ...filters, department: e.target.value });
    setPagination({ ...pagination, pageNumber: 1 });
  };

  const handlePageChange = (newPage) => {
    setPagination({ ...pagination, pageNumber: newPage });
  };

  // Handle view appointment details
  const handleViewAppointment = async (appointment) => {
    setSelectedAppointment(appointment);
    setShowViewModal(true);
  };

  // Handle edit appointment
  const handleEditAppointment = (appointment) => {
    setSelectedAppointment(appointment);
    setEditForm({
      appointmentDate: appointment.date || '',
      appointmentTime: appointment.time || '',
      consultationType: appointment.consultationType || '',
      status: appointment.status || '',
      reason: appointment.followUpDate
        ? new Date(appointment.followUpDate).toISOString().split('T')[0]
        : '',
      notes: appointment.doctorNotes || '',
      diagnosis: appointment.diagnosis || ''
    });
    setShowEditModal(true);
  };

  // Handle update appointment
  const handleUpdateAppointment = async (e) => {
    e.preventDefault();

    try {
      // Combine date and time into DateTime
      const appointmentDateTime = new Date(`${editForm.appointmentDate}T${editForm.appointmentTime}:00`);

      // Prepare data according to UpdateAppointmentAdminDto
      const updateData = {
        appointmentTime: appointmentDateTime.toISOString(),
        consultationType: editForm.consultationType,
        status: editForm.status,
        followUpDate: editForm.reason ? new Date(editForm.reason).toISOString() : null,
        doctorNotes: editForm.notes || null,
        diagnosis: editForm.diagnosis || null
      };

      await appointmentsApi.update(selectedAppointment.appointmentID, updateData);

      // Close modal first
      setShowEditModal(false);

      // Then fetch updated data
      await fetchAppointments();
      await fetchStats();

      // Finally show success message
      showToast({
        title: 'Success!',
        message: 'Appointment has been updated successfully',
        type: 'success'
      });
    } catch (err) {
      showToast({
        title: 'Update Failed',
        message: err.response?.data?.error || 'Failed to update appointment',
        type: 'error',
        duration: 5000
      });
      console.error('Error updating appointment:', err);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getStatusBadgeClass = (status) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'scheduled':
      case 'pending':
        return 'secondary';
      case 'in progress':
        return 'warning';
      case 'cancelled':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  return (
    <NavbarAdmin
      sidebarCollapsed={sidebarCollapsed}
      onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
    >
      <main className="admin-content p-4">
        {/* Appointments Page Header with Visual Distinction */}
        <div className="admin-page-header-appointments-v2 mb-4">
          <div className="d-flex justify-content-between align-items-start">
            <div className="admin-page-title-section">
              <div className="d-flex align-items-center gap-3 mb-2">
                <div className="admin-page-icon-appointments-v2">
                  <i className="bi bi-calendar2-event-fill"></i>
                </div>
                <div>
                  <h2 className="admin-page-title mb-1">
                    Appointments Management
                  </h2>
                  <div className="d-flex align-items-center gap-2">
                    <span className="admin-page-badge-appointments-v2">
                      <i className="bi bi-calendar-check-fill me-1"></i>
                      Scheduling Dashboard
                    </span>
                    <span className="admin-page-count">
                      {pagination.totalCount} Total {pagination.totalCount === 1 ? 'Appointment' : 'Appointments'}
                    </span>
                  </div>
                </div>
              </div>
              <p className="admin-page-subtitle-appointments-v2 mb-0">
                Manage appointment schedules, track bookings, and monitor consultation status
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats Inline */}
        <div className="appointments-stats-inline mb-4">
          <div className="stat-inline-item stat-today">
            <div className="stat-inline-icon">
              <i className="bi bi-calendar-check-fill"></i>
            </div>
            <div className="stat-inline-content">
              <div className="stat-inline-value">{stats.todayAppointments}</div>
              <div className="stat-inline-label">Today</div>
            </div>
          </div>

          <div className="stat-inline-item stat-pending">
            <div className="stat-inline-icon">
              <i className="bi bi-hourglass-split"></i>
            </div>
            <div className="stat-inline-content">
              <div className="stat-inline-value">{stats.pendingApproval}</div>
              <div className="stat-inline-label">Pending</div>
            </div>
          </div>

          <div className="stat-inline-item stat-completed">
            <div className="stat-inline-icon">
              <i className="bi bi-check-circle-fill"></i>
            </div>
            <div className="stat-inline-content">
              <div className="stat-inline-value">{stats.completed}</div>
              <div className="stat-inline-label">Completed</div>
            </div>
          </div>

          <div className="stat-inline-item stat-cancelled">
            <div className="stat-inline-icon">
              <i className="bi bi-x-circle-fill"></i>
            </div>
            <div className="stat-inline-content">
              <div className="stat-inline-value">{stats.cancelled}</div>
              <div className="stat-inline-label">Cancelled</div>
            </div>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
          </div>
        )}

        {/* Filter and Search */}
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
                    setFilters({ searchTerm: '', date: '', status: '', department: '' });
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
              <div className="col-md-4" style={{ padding: "0 0 10px 20px" }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by patient, doctor, ID..."
                  value={filters.searchTerm}
                  onChange={handleSearch}
                />
              </div>
              <div className="col-md-2">
                <input
                  type="date"
                  className="form-control"
                  value={filters.date}
                  onChange={handleDateFilter}
                />
              </div>
              <div className="col-md-3">
                <select
                  className="form-select"
                  value={filters.status}
                  onChange={handleStatusFilter}
                >
                  <option value="">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div className="col-md-3" style={{ padding: "0 20px 0 0" }}>
                <select
                  className="form-select"
                  value={filters.department}
                  onChange={handleDepartmentFilter}
                >
                  <option value="">All Departments</option>
                  {departments.map((dept, index) => (
                    <option key={index} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Appointments Card Grid */}
        <div className="appointments-container">
          {loading ? (
            <div className="appointments-loading">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3">Loading appointments...</p>
            </div>
          ) : appointments.length === 0 ? (
            <div className="appointments-empty">
              <i className="bi bi-calendar-x"></i>
              <h5>No Appointments Found</h5>
              <p>There are no appointments matching your criteria</p>
            </div>
          ) : (
            <div className="appointments-grid">
              {appointments.map((appointment) => (
                <div key={appointment.appointmentID} className={`appointment-card status-${appointment.status.toLowerCase().replace(' ', '-')}`}>
                  {/* Status Bar */}
                  <div className="appointment-status-bar"></div>

                  {/* Card Header */}
                  <div className="appointment-card-header">
                    <div className="appointment-id">
                      <i className="bi bi-hash"></i>
                      <span>{appointment.appointmentID}</span>
                    </div>
                    <span className={`appointment-status-badge badge-${appointment.status.toLowerCase().replace(' ', '-')}`}>
                      {appointment.status}
                    </span>
                  </div>

                  {/* Date & Time Section */}
                  <div className="appointment-datetime">
                    <div className="datetime-item">
                      <i className="bi bi-calendar3"></i>
                      <span>{appointment.date}</span>
                    </div>
                    <div className="datetime-item time">
                      <i className="bi bi-clock"></i>
                      <span>{appointment.time}</span>
                    </div>
                  </div>

                  {/* Patient Info */}
                  <div className="appointment-section">
                    <div className="section-label">
                      <i className="bi bi-person"></i>
                      Patient
                    </div>
                    <div className="section-value patient-name">
                      {appointment.patientName}
                    </div>
                  </div>

                  {/* Doctor Info */}
                  <div className="appointment-section">
                    <div className="section-label">
                      <i className="bi bi-person-badge"></i>
                      Doctor
                    </div>
                    <div className="section-value doctor-info">
                      <div className="doctor-avatar">
                        {appointment.doctorName.charAt(0)}
                      </div>
                      <span>{appointment.doctorName}</span>
                    </div>
                  </div>

                  {/* Department */}
                  <div className="appointment-section">
                    <div className="section-label">
                      <i className="bi bi-hospital"></i>
                      Department
                    </div>
                    <div className="section-value">
                      <span className="department-badge">{appointment.department}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="appointment-actions">
                    <button
                      className="action-btn view-btn"
                      title="View Details"
                      onClick={() => handleViewAppointment(appointment)}
                    >
                      <i className="bi bi-eye"></i>
                      <span>View</span>
                    </button>
                    <button
                      className="action-btn edit-btn"
                      title="Edit Appointment"
                      onClick={() => handleEditAppointment(appointment)}
                    >
                      <i className="bi bi-pencil"></i>
                      <span>Edit</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="appointments-pagination-wrapper">
          {!loading && appointments.length > 0 && (
            <div className="card-footer bg-white">
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted" style={{ fontSize: '13px' }}>
                  Page <strong style={{ color: 'var(--admin-text)' }}>{pagination.pageNumber}</strong> of <strong style={{ color: 'var(--admin-text)' }}>{pagination.totalPages}</strong> • <strong style={{ color: 'var(--admin-text)' }}>{pagination.totalCount}</strong> total appointments
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
                        // Show all pages if 7 or less
                        for (let i = 1; i <= totalPages; i++) {
                          pageNumbers.push(i);
                        }
                      } else {
                        // Always show first page
                        pageNumbers.push(1);

                        if (currentPage > 3) {
                          pageNumbers.push('...');
                        }

                        // Show current page and neighbors
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

                        // Always show last page
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
        </div>

        {/* View Appointment Details Modal */}
        {showViewModal && selectedAppointment && (
          <div className="modal show d-block admin-modal-backdrop" tabIndex="-1">
            <div className="modal-dialog modal-lg modal-dialog-scrollable">
              <div className="modal-content" style={{ border: 'none', boxShadow: 'var(--shadow-lg)' }}>
                <div className="modal-header admin-modal-header primary">
                  <h5 className="modal-title">
                    <i className="bi bi-calendar-check me-2"></i>
                    Appointment Details
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setShowViewModal(false)}
                  ></button>
                </div>
                <div className="modal-body admin-modal-body" style={{ backgroundColor: 'var(--admin-bg)' }}>
                  <div className="row">
                    {/* Left Column */}
                    <div className="col-md-6">
                      <div className="admin-modal-section">
                        <h6 className="admin-modal-section-title primary">
                          <i className="bi bi-info-circle me-2"></i>
                          Appointment Information
                        </h6>
                        <div className="admin-info-row">
                          <strong>Appointment ID:</strong>
                          <span>{selectedAppointment.appointmentID}</span>
                        </div>
                        <div className="admin-info-row">
                          <strong>Date:</strong>
                          <span>{selectedAppointment.date}</span>
                        </div>
                        <div className="admin-info-row">
                          <strong>Time:</strong>
                          <span>{selectedAppointment.time}</span>
                        </div>
                        <div className="admin-info-row">
                          <strong>Consultation Type:</strong>
                          <span>{selectedAppointment.consultationType || 'N/A'}</span>
                        </div>
                        <div className="admin-info-row">
                          <strong>Status:</strong>
                          <span className={`admin-badge ${getStatusBadgeClass(selectedAppointment.status)}`}>
                            {selectedAppointment.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="col-md-6">
                      <div className="admin-modal-section">
                        <h6 className="admin-modal-section-title info">
                          <i className="bi bi-people me-2"></i>
                          Patient & Doctor Information
                        </h6>
                        <div className="admin-info-row">
                          <strong>Patient Name:</strong>
                          <span>{selectedAppointment.patientName}</span>
                        </div>
                        <div className="admin-info-row">
                          <strong>Doctor Name:</strong>
                          <span>{selectedAppointment.doctorName}</span>
                        </div>
                        <div className="admin-info-row">
                          <strong>Department:</strong>
                          <span>{selectedAppointment.department}</span>
                        </div>
                        <div className="admin-info-row">
                          <strong>Follow update:</strong>
                          <span>
                            {selectedAppointment.followUpDate
                              ? new Date(selectedAppointment.followUpDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })
                              : 'No follow-up date set'}
                          </span>
                        </div>
                        <div className="admin-info-row">
                          <strong>Diagnosis:</strong>
                          <span style={{
                            color: selectedAppointment.diagnosis ? '#008f7d' : '#6b7280',
                            fontWeight: selectedAppointment.diagnosis ? '600' : 'normal'
                          }}>
                            {selectedAppointment.diagnosis || 'No diagnosis recorded'}
                          </span>
                        </div>
                        <div className="admin-info-row">
                          <strong>Doctor Notes:</strong>
                          <span>{selectedAppointment.doctorNotes || 'No notes'}</span>
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

        {/* Edit Appointment Modal */}
        {showEditModal && selectedAppointment && (
          <div className="modal show d-block admin-modal-backdrop" tabIndex="-1">
            <div className="modal-dialog modal-xl" style={{ maxWidth: '90%' }}>
              <div className="modal-content" style={{ border: 'none', boxShadow: 'var(--shadow-lg)' }}>
                <div className="modal-header admin-modal-header info">
                  <h5 className="modal-title">
                    <i className="bi bi-pencil-square me-2"></i>
                    Edit Appointment
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setShowEditModal(false)}
                  ></button>
                </div>
                <form onSubmit={handleUpdateAppointment}>
                  <div className="modal-body admin-modal-body" style={{ maxHeight: '75vh', overflowY: 'auto', backgroundColor: 'var(--admin-bg)' }}>
                    <div className="row">
                      {/* Left Column - Basic Information */}
                      <div className="col-lg-6">
                        <div className="admin-modal-section">
                          <h6 className="admin-modal-section-title primary">
                            <i className="bi bi-calendar-event me-2"></i>
                            Appointment Details
                          </h6>
                          <div className="admin-info-row">
                            <strong>Patient:</strong>
                            <span>{selectedAppointment.patientName}</span>
                          </div>
                          <div className="admin-info-row">
                            <strong>Doctor:</strong>
                            <span>{selectedAppointment.doctorName}</span>
                          </div>
                          <div className="admin-info-row">
                            <strong>Department:</strong>
                            <span>{selectedAppointment.department}</span>
                          </div>
                          <div className="mb-3">
                            <label className="admin-form-label">Appointment Date <span className="text-danger">*</span></label>
                            <input
                              type="date"
                              className="form-control admin-form-control"
                              value={editForm.appointmentDate}
                              onChange={(e) => setEditForm({ ...editForm, appointmentDate: e.target.value })}
                              required
                            />
                          </div>
                          <div className="mb-3">
                            <label className="admin-form-label">Appointment Time <span className="text-danger">*</span></label>
                            <input
                              type="time"
                              className="form-control admin-form-control"
                              value={editForm.appointmentTime}
                              onChange={(e) => setEditForm({ ...editForm, appointmentTime: e.target.value })}
                              required
                            />
                          </div>
                          <div className="mb-3">
                            <label className="admin-form-label">Consultation Type <span className="text-danger">*</span></label>
                            <select
                              className="form-select admin-form-control"
                              value={editForm.consultationType}
                              onChange={(e) => setEditForm({ ...editForm, consultationType: e.target.value })}
                              required
                            >
                              <option value="">Select Type</option>
                              <option value="Video">Video Call</option>
                              <option value="Chat">Chat</option>
                            </select>
                          </div>
                          <div className="mb-3">
                            <label className="admin-form-label">Status <span className="text-danger">*</span></label>
                            <select
                              className="form-select admin-form-control"
                              value={editForm.status}
                              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                              required
                            >
                              <option value="Pending">Pending</option>
                              <option value="Scheduled">Scheduled</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Completed">Completed</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Right Column - Additional Information */}
                      <div className="col-lg-6">
                        <div className="admin-modal-section">
                          <h6 className="admin-modal-section-title info">
                            <i className="bi bi-file-text me-2"></i>
                            Additional Information
                          </h6>
                          <div className="mb-3">
                            <label className="admin-form-label">Follow update</label>
                            <input
                              type="date"
                              className="form-control admin-form-control"
                              value={editForm.reason}
                              onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                            />
                          </div>
                          <div className="mb-3">
                            <label className="admin-form-label" style={{
                              color: '#008f7d',
                              fontWeight: '600',
                              fontSize: '14px'
                            }}>
                              <i className="bi bi-clipboard2-pulse-fill me-2"></i>
                              Diagnosis
                            </label>
                            <textarea
                              className="form-control admin-form-control"
                              rows="4"
                              value={editForm.diagnosis}
                              onChange={(e) => setEditForm({ ...editForm, diagnosis: e.target.value })}
                              placeholder="Enter diagnosis..."
                              style={{
                                borderColor: '#99f6e4',
                                backgroundColor: '#f0fdf9'
                              }}
                            ></textarea>
                          </div>
                          <div className="mb-3">
                            <label className="admin-form-label">Doctor Notes</label>
                            <textarea
                              className="form-control admin-form-control"
                              rows="4"
                              value={editForm.notes}
                              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                              placeholder="Enter doctor's notes..."
                            ></textarea>
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
