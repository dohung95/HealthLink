import React, { useState, useEffect } from "react";
import NavbarAdmin from "./NavbarAdmin";
import PatientCardGrid from "./PatientCardGrid";
import { medicalRecordsApi } from "../../../services/adminApi";
import Toast from "./Toast";
import useToast from "../useToast";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../Css/Admin.css";

const API_BASE_URL = 'https://localhost:7267';

export default function MedicalRecords() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientHistory, setPatientHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast, showToast, hideToast } = useToast();

  const [pagination, setPagination] = useState({
    pageNumber: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [documentPreviewUrl, setDocumentPreviewUrl] = useState(null);
  const [documentTextContent, setDocumentTextContent] = useState(null);
  const [loadingDocument, setLoadingDocument] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  // Prescription state
  const [prescriptions, setPrescriptions] = useState([]);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [prescriptionsByAppointment, setPrescriptionsByAppointment] = useState({});

  // Auto-collapse sidebar based on screen size
  useEffect(() => {
    const handleResize = () => {
      // Mobile (< 768px): Default to collapsed (hidden)
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      }
      // Tablet (768px - 1200px): Default to NOT collapsed (so it shows condensed sidebar)
      // Desktop (> 1200px): Default to NOT collapsed
      else {
        setSidebarCollapsed(false);
      }
    };

    // Initial check
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch patient list
  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await medicalRecordsApi.getPatients({
        pageNumber: pagination.pageNumber,
        pageSize: pagination.pageSize,
        searchTerm: searchTerm
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

  // Fetch patient medical history
  const fetchPatientHistory = async (patientId) => {
    try {
      setLoading(true);
      const history = await medicalRecordsApi.getPatientMedicalHistory(patientId);
      setPatientHistory(history);
      setSelectedCategory('all');

      // Fetch prescriptions for appointments
      await fetchPrescriptionsForAppointments(patientId);
    } catch (err) {
      showToast({
        title: 'Error',
        message: err.response?.data?.error || 'Failed to fetch patient history',
        type: 'error'
      });
      console.error('Error fetching patient history:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch prescriptions and group by appointment ID
  const fetchPrescriptionsForAppointments = async (patientId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/api/admin/adminmedicalrecords/patient/${patientId}/prescriptions`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch prescriptions');
      }

      const prescriptions = await response.json();

      // Group prescriptions by appointmentID
      const grouped = prescriptions.reduce((acc, prescription) => {
        const appointmentId = prescription.appointmentID;
        if (!acc[appointmentId]) {
          acc[appointmentId] = [];
        }
        acc[appointmentId].push(prescription);
        return acc;
      }, {});

      setPrescriptionsByAppointment(grouped);
    } catch (err) {
      console.error('Error fetching prescriptions:', err);
      setPrescriptionsByAppointment({});
    }
  };

  useEffect(() => {
    if (!selectedPatient) {
      fetchPatients();
    }
  }, [pagination.pageNumber, searchTerm, selectedPatient]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setPagination({ ...pagination, pageNumber: 1 });
  };

  const handlePageChange = (newPage) => {
    setPagination({ ...pagination, pageNumber: newPage });
  };

  const handleViewPatient = (patient) => {
    setSelectedPatient(patient);
    fetchPatientHistory(patient.patientID);
  };

  const handleBackToList = () => {
    setSelectedPatient(null);
    setPatientHistory(null);
    setSelectedCategory('all');
  };

  const handleViewDocument = async (document) => {
    setSelectedDocument(document);
    setShowDocumentModal(true);
    setDocumentPreviewUrl(null);
    setDocumentTextContent(null);

    // Fetch document with authentication for preview if it's a previewable type
    if (isPreviewable(document.documentType)) {
      await fetchDocumentPreview(document.documentID, document.documentType);
    }
  };

  const handleViewAppointment = (appointment) => {
    setSelectedAppointment(appointment);
    setShowAppointmentModal(true);
  };

  const fetchDocumentPreview = async (documentId, documentType) => {
    try {
      setLoadingDocument(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_BASE_URL}/api/MedicalDocument/file/${documentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to load document:', response.status, errorText);
        throw new Error(`Failed to load document: ${response.status} ${response.statusText}`);
      }

      const type = documentType?.toLowerCase() || '';

      // Handle text files differently
      if (type.includes('text') || type.includes('txt')) {
        const text = await response.text();
        setDocumentTextContent(text);
      } else {
        // Handle images and PDFs as blobs
        const blob = await response.blob();

        if (blob.size === 0) {
          throw new Error('Received empty file');
        }

        const url = URL.createObjectURL(blob);
        setDocumentPreviewUrl(url);
      }
    } catch (error) {
      console.error('Error loading document:', error);
      showToast({
        title: 'Error',
        message: error.message || 'Failed to load document preview',
        type: 'error'
      });
    } finally {
      setLoadingDocument(false);
    }
  };

  // Cleanup blob URL when modal closes
  useEffect(() => {
    return () => {
      if (documentPreviewUrl) {
        URL.revokeObjectURL(documentPreviewUrl);
      }
    };
  }, [documentPreviewUrl]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (documentType) => {
    const type = documentType?.toLowerCase() || '';
    if (type.includes('pdf')) return 'bi-file-pdf text-danger';
    if (type.includes('image') || type.includes('jpg') || type.includes('png') || type.includes('jpeg') || type.includes('gif') || type.includes('bmp')) return 'bi-file-image text-primary';
    if (type.includes('doc') || type.includes('word')) return 'bi-file-word text-info';
    if (type.includes('xls') || type.includes('excel') || type.includes('spreadsheet')) return 'bi-file-excel text-success';
    if (type.includes('ppt') || type.includes('powerpoint') || type.includes('presentation')) return 'bi-file-ppt text-warning';
    if (type.includes('txt') || type.includes('text')) return 'bi-file-text text-secondary';
    if (type.includes('zip') || type.includes('rar') || type.includes('7z')) return 'bi-file-zip text-dark';
    if (type.includes('video') || type.includes('mp4') || type.includes('avi') || type.includes('mov')) return 'bi-file-play text-primary';
    if (type.includes('audio') || type.includes('mp3') || type.includes('wav')) return 'bi-file-music text-info';
    return 'bi-file-earmark text-secondary';
  };

  // Check if file type is previewable
  const isPreviewable = (documentType) => {
    const type = documentType?.toLowerCase() || '';
    // Only support images and PDFs for preview
    return type.includes('image') || type.includes('jpg') || type.includes('png') ||
      type.includes('jpeg') || type.includes('gif') || type.includes('bmp') || type.includes('webp') ||
      type.includes('pdf');
  };

  const getCategoryIcon = (category) => {
    const cat = category?.toLowerCase() || '';
    if (cat.includes('x-ray') || cat.includes('imaging')) return 'bi-x-ray';
    if (cat.includes('lab') || cat.includes('blood')) return 'bi-droplet';
    if (cat.includes('prescription')) return 'bi-prescription2';
    if (cat.includes('ct') || cat.includes('mri')) return 'bi-hospital';
    if (cat.includes('consultation')) return 'bi-chat-left-text';
    return 'bi-folder';
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-success';
      case 'scheduled':
        return 'bg-primary';
      case 'cancelled':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  };

  // Filter documents by category
  const getFilteredDocuments = () => {
    if (!patientHistory?.documentsByCategory) return [];
    if (selectedCategory === 'all') return patientHistory.documentsByCategory;
    return patientHistory.documentsByCategory.filter(cat => cat.category === selectedCategory);
  };

  // Get document file URL
  const getDocumentFileUrl = (documentId) => {
    return `${API_BASE_URL}/api/MedicalDocument/file/${documentId}`;
  };

  // Handle document download with authentication
  const handleDownloadDocument = async (documentId, documentName) => {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_BASE_URL}/api/MedicalDocument/file/${documentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download document');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = documentName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      showToast({
        title: 'Error',
        message: 'Failed to download document',
        type: 'error'
      });
    }
  };

  return (
    <NavbarAdmin
      sidebarCollapsed={sidebarCollapsed}
      onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
    >
      <main className="admin-content p-4">
        {toast.show && (
          <Toast
            title={toast.title}
            message={toast.message}
            type={toast.type}
            onClose={hideToast}
          />
        )}

        {!selectedPatient ? (
          // PATIENT LIST VIEW
          <>
            <div className="admin-page-header-doctors mb-4">
              <div className="d-flex justify-content-between align-items-start">
                <div className="admin-page-title-section">
                  <div className="d-flex align-items-center gap-3 mb-2">
                    <div className="admin-page-icon-doctors">
                      <i className="bi bi-file-medical-fill"></i>
                    </div>
                    <div>
                      <h2 className="admin-page-title mb-1">
                        Medical Records - Patient View
                      </h2>
                      <div className="d-flex align-items-center gap-2">
                        <span className="admin-page-badge-doctors">
                          <i className="bi bi-people-fill me-1"></i>
                          Patient-Centric Records
                        </span>
                        <span className="admin-page-count">
                          {pagination.totalCount} {pagination.totalCount === 1 ? 'Patient' : 'Patients'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="admin-page-subtitle-doctors mb-0">
                    View comprehensive medical history organized by patient
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="alert alert-danger" role="alert">
                <i className="bi bi-exclamation-triangle me-2"></i>
                {error}
              </div>
            )}

            {/* Search */}
            <div className="admin-card mb-4">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div className="d-flex align-items-center" style={{ padding: "5px 10px" }}>
                    <i className="bi bi-search me-2" style={{ color: 'var(--admin-text-light)' }}></i>
                    <h6 className="mb-0" style={{ color: 'var(--admin-text-light)', fontSize: '13px', fontWeight: 600 }}>SEARCH PATIENTS</h6>
                  </div>
                  <div style={{ padding: "15px 5px 0 5px" }}>
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => {
                        setSearchTerm('');
                        setPagination({ ...pagination, pageNumber: 1 });
                      }}
                      style={{ fontSize: '12px' }}
                    >
                      <i className="bi bi-x-circle me-1"></i>
                      Clear
                    </button>
                  </div>
                </div>
                <div className="row g-3">
                  <div className="col-md-12" style={{ padding: "0 20px 10px 20px" }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search by patient name, ID, or email..."
                      value={searchTerm}
                      onChange={handleSearch}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Patient List Table */}
            <div className="admin-card">
              <div className="card-body p-0">
                {loading ? (
                  <div className="admin-loading">
                    <div className="spinner-border" style={{ color: 'var(--admin-primary)' }} role="status">
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
                  <PatientCardGrid
                    patients={patients}
                    onViewPatient={handleViewPatient}
                    formatDate={formatDate}
                  />
                )}
              </div>

              {/* Pagination */}
              {!loading && patients.length > 0 && (
                <div className="card-footer bg-white">
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted" style={{ fontSize: '13px' }}>
                      Page <strong style={{ color: 'var(--admin-text)' }}>{pagination.pageNumber}</strong> of <strong style={{ color: 'var(--admin-text)' }}>{pagination.totalPages}</strong> • <strong style={{ color: 'var(--admin-text)' }}>{pagination.totalCount}</strong> total patients
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
                            if (currentPage > 3) pageNumbers.push('...');
                            const start = Math.max(2, currentPage - 1);
                            const end = Math.min(totalPages - 1, currentPage + 1);
                            for (let i = start; i <= end; i++) {
                              if (!pageNumbers.includes(i)) pageNumbers.push(i);
                            }
                            if (currentPage < totalPages - 2) pageNumbers.push('...');
                            if (!pageNumbers.includes(totalPages)) pageNumbers.push(totalPages);
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
          </>
        ) : (
          // PATIENT DETAIL VIEW
          <>
            {loading ? (
              <div className="admin-loading">
                <div className="spinner-border" style={{ color: 'var(--admin-primary)' }} role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2">Loading patient medical history...</p>
              </div>
            ) : patientHistory && (
              <>
                {/* Back Button */}
                <div className="mb-3">
                  <button
                    className="btn btn-outline-secondary"
                    onClick={handleBackToList}
                  >
                    <i className="bi bi-arrow-left me-2"></i>
                    Back to Patient List
                  </button>
                </div>

                {/* Patient Header */}
                <div className="admin-card mb-4" style={{
                  background: 'linear-gradient(135deg, var(--admin-primary-dark) 0%, var(--admin-primary) 100%)',
                  color: 'white',
                  padding: 'var(--spacing-lg)'
                }}>
                  <div className="row align-items-center">
                    <div className="col-md-8">
                      <div className="d-flex align-items-center gap-3 mb-3">
                        <div className="rounded-circle bg-white text-primary d-flex align-items-center justify-content-center" style={{ width: "60px", height: "60px", fontSize: "24px", fontWeight: "bold" }}>
                          {patientHistory.fullName.charAt(0)}
                        </div>
                        <div>
                          <h3 className="mb-1" style={{ fontWeight: '700' }}>{patientHistory.fullName}</h3>
                          <p className="mb-0" style={{ opacity: 0.9 }}>Patient ID: {patientHistory.patientID}</p>
                        </div>
                      </div>
                      <div className="row">
                        <div className="col-md-6">
                          <div style={{ fontSize: 'var(--font-size-sm)', opacity: 0.8 }}>Email</div>
                          <div style={{ fontWeight: '600' }}>{patientHistory.email}</div>
                        </div>
                        <div className="col-md-6">
                          <div style={{ fontSize: 'var(--font-size-sm)', opacity: 0.8 }}>Phone</div>
                          <div style={{ fontWeight: '600' }}>{patientHistory.phoneNumber || 'N/A'}</div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="row">
                        <div className="col-6">
                          <div style={{ fontSize: 'var(--font-size-sm)', opacity: 0.8 }}>Gender</div>
                          <div style={{ fontWeight: '600' }}>{patientHistory.gender || 'N/A'}</div>
                        </div>
                        <div className="col-6">
                          <div style={{ fontSize: 'var(--font-size-sm)', opacity: 0.8 }}>Blood Type</div>
                          <div style={{ fontWeight: '600' }}>{patientHistory.bloodType || 'N/A'}</div>
                        </div>
                        <div className="col-12 mt-2">
                          <div style={{ fontSize: 'var(--font-size-sm)', opacity: 0.8 }}>Date of Birth</div>
                          <div style={{ fontWeight: '600' }}>{formatDate(patientHistory.dateOfBirth)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {patientHistory.medicalHistorySummary && (
                    <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.2)' }}>
                      <div style={{ fontSize: 'var(--font-size-sm)', opacity: 0.8 }}>Medical History Summary</div>
                      <div style={{ fontWeight: '500' }}>{patientHistory.medicalHistorySummary}</div>
                    </div>
                  )}
                </div>

                {/* Medical Records Section - Completed Appointments with Prescriptions */}
                <div className="admin-card mb-4">
                  <div className="card-header" style={{
                    background: '#ffffff',
                    color: '#0f172a',
                    borderRadius: '12px 12px 0 0',
                    padding: '20px',
                    borderBottom: '1px solid #f1f5f9'
                  }}>
                    <h5 className="mb-0 d-flex align-items-center" style={{ fontWeight: '600', fontSize: '18px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: '#f0fdf9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '12px',
                        color: '#00a08b'
                      }}>
                        <i className="bi bi-file-medical"></i>
                      </div>
                      Medical Records
                      {(() => {
                        const completedCount = patientHistory.appointments?.filter(apt => apt.status === 'Completed').length || 0;
                        return completedCount > 0 && (
                          <span className="badge ms-2" style={{
                            fontSize: '12px',
                            background: '#f0fdf9',
                            color: '#00a08b',
                            border: '1px solid #cffafe',
                            borderRadius: '6px',
                            padding: '5px 10px'
                          }}>
                            {completedCount} Completed
                          </span>
                        );
                      })()}
                    </h5>
                  </div>
                  <div className="card-body" style={{ padding: '20px' }}>
                    {(() => {
                      const completedAppointments = patientHistory.appointments?.filter(apt => apt.status === 'Completed') || [];

                      if (completedAppointments.length === 0) {
                        return (
                          <div className="text-center text-muted py-5">
                            <i className="bi bi-calendar-x" style={{ fontSize: '48px' }}></i>
                            <p className="mt-3">No completed appointments</p>
                            <p className="text-muted small">Medical records will appear here after appointments are completed</p>
                          </div>
                        );
                      }

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                          {completedAppointments.map((appointment, index) => {
                            const appointmentPrescriptions = prescriptionsByAppointment[appointment.appointmentID] || [];

                            // Single professional medical theme - deep blue
                            const theme = {
                              main: '#008f7d',      // Deep blue - professional medical
                              light: '#e6f4f9',     // Very light blue background
                              border: '#66b3d4',    // Soft blue border
                              icon: '#004d73'       // Darker blue icon
                            };

                            return (
                              <div
                                key={appointment.appointmentID}
                                className="medical-record-card"
                                style={{
                                  background: '#ffffff',
                                  border: `2px solid ${theme.border}`,
                                  borderRadius: '12px',
                                  padding: '20px',
                                  position: 'relative',
                                  overflow: 'hidden',
                                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                                }}
                              >
                                {/* Status Indicator Bar */}
                                <div style={{
                                  position: 'absolute',
                                  left: 0,
                                  top: 0,
                                  bottom: 0,
                                  width: '4px',
                                  background: theme.main
                                }}></div>

                                {/* Appointment Header */}
                                <div style={{ paddingLeft: '15px' }}>
                                  <div className="d-flex justify-content-between align-items-start mb-3">
                                    <div className="d-flex align-items-start gap-3">
                                      <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '10px',
                                        background: theme.light,
                                        border: `1px solid ${theme.border}`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: theme.main,
                                        fontSize: '20px',
                                        flexShrink: 0
                                      }}>
                                        <i className="bi bi-check-circle-fill"></i>
                                      </div>
                                      <div>
                                        <h6 className="mb-1" style={{ color: '#0f172a', fontWeight: '600', fontSize: '15px' }}>
                                          {formatDateTime(appointment.appointmentTime)}
                                          <span className="ms-2" style={{ fontWeight: '500', fontSize: '12px', color: theme.icon, opacity: 0.8 }}>
                                            #{appointment.appointmentID}
                                          </span>
                                        </h6>
                                        <p className="mb-1" style={{ fontSize: '15px', color: theme.main, fontWeight: '600' }}>
                                          <i className="bi bi-person-badge me-1" style={{ color: theme.main }}></i>
                                          Dr. {appointment.doctorName}
                                        </p>
                                        <div className="d-flex flex-wrap gap-2 mt-2">
                                          <span style={{
                                            fontSize: '11px',
                                            padding: '3px 10px',
                                            background: '#f1f5f9',
                                            color: '#475569',
                                            borderRadius: '4px',
                                            fontWeight: '500'
                                          }}>
                                            <i className="bi bi-hospital me-1"></i>
                                            {appointment.doctorSpecialty}
                                          </span>
                                          <span style={{
                                            fontSize: '11px',
                                            padding: '3px 10px',
                                            background: '#f1f5f9',
                                            color: '#475569',
                                            borderRadius: '4px',
                                            fontWeight: '500'
                                          }}>
                                            <i className="bi bi-clipboard-pulse me-1"></i>
                                            {appointment.consultationType}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <span className="badge" style={{
                                      background: theme.light,
                                      color: theme.main,
                                      fontSize: '11px',
                                      padding: '5px 12px',
                                      fontWeight: '600',
                                      borderRadius: '6px',
                                      border: `1px solid ${theme.border}`
                                    }}>
                                      <i className="bi bi-check-circle me-1"></i>
                                      Completed
                                    </span>
                                  </div>

                                  {/* Diagnosis - PRIORITY DISPLAY */}
                                  {appointment.diagnosis && (
                                    <div className="mt-3 p-3" style={{
                                      background: 'linear-gradient(135deg, #f0fdf9 0%, #ccf3ed 100%)',
                                      borderLeft: '4px solid #14b8a6',
                                      borderRadius: '8px',
                                      border: '2px solid #5eead4',
                                      boxShadow: '0 2px 8px rgba(20, 184, 166, 0.15)'
                                    }}>
                                      <div className="d-flex align-items-center gap-2 mb-2">
                                        <i className="bi bi-clipboard2-pulse-fill" style={{ color: '#008f7d', fontSize: '18px' }}></i>
                                        <strong style={{ color: '#134e4a', fontSize: '15px', fontWeight: '700' }}>Diagnosis</strong>
                                      </div>
                                      <p className="mb-0" style={{ fontSize: '14px', color: '#115e59', lineHeight: '1.7', fontWeight: '500' }}>
                                        {appointment.diagnosis}
                                      </p>
                                    </div>
                                  )}

                                  {/* Doctor Notes - Secondary */}
                                  {appointment.doctorNotes && (
                                    <div className="mt-3 p-2" style={{
                                      background: '#f9fafb',
                                      borderLeft: '2px solid #d1d5db',
                                      borderRadius: '6px',
                                      border: '1px solid #e5e7eb'
                                    }}>
                                      <div className="d-flex align-items-center gap-2 mb-1">
                                        <i className="bi bi-journal-text" style={{ color: '#6b7280', fontSize: '13px' }}></i>
                                        <strong style={{ color: '#6b7280', fontSize: '12px', fontWeight: '600' }}>Doctor's Notes</strong>
                                      </div>
                                      <p className="mb-0" style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.5' }}>
                                        {appointment.doctorNotes}
                                      </p>
                                    </div>
                                  )}

                                  {/* Prescriptions for this appointment */}
                                  {appointmentPrescriptions.length > 0 && (
                                    <div className="mt-3">
                                      <div className="d-flex align-items-center gap-2 mb-3">
                                        <i className="bi bi-prescription2" style={{ color: '#8b5cf6', fontSize: '18px' }}></i>
                                        <strong style={{ color: '#0f172a', fontSize: '14px' }}>
                                          Prescriptions ({appointmentPrescriptions.length})
                                        </strong>
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {appointmentPrescriptions.map((prescription) => (
                                          <div
                                            key={prescription.prescriptionHeaderID}
                                            className="prescription-item"
                                            style={{
                                              background: '#fcfaff',
                                              border: '1px solid #f3e8ff',
                                              borderRadius: '8px',
                                              padding: '14px',
                                              cursor: 'pointer',
                                              transition: 'all 0.2s ease'
                                            }}
                                            onClick={() => {
                                              setSelectedPrescription(prescription);
                                              setShowPrescriptionModal(true);
                                            }}
                                            onMouseEnter={(e) => {
                                              e.currentTarget.style.transform = 'translateY(-2px)';
                                              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                                              e.currentTarget.style.borderColor = '#d8b4fe';
                                            }}
                                            onMouseLeave={(e) => {
                                              e.currentTarget.style.transform = 'translateY(0)';
                                              e.currentTarget.style.boxShadow = 'none';
                                              e.currentTarget.style.borderColor = '#f3e8ff';
                                            }}
                                          >
                                            <div className="d-flex align-items-start gap-3">
                                              <div style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '8px',
                                                background: '#f3e8ff',
                                                border: '1px solid #d8b4fe',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#7c3aed',
                                                fontSize: '18px',
                                                flexShrink: 0
                                              }}>
                                                <i className="bi bi-prescription2"></i>
                                              </div>
                                              <div className="flex-grow-1">
                                                <div className="d-flex justify-content-between align-items-start mb-1">
                                                  <h6 className="mb-0" style={{ color: '#0f172a', fontWeight: '600', fontSize: '13px' }}>
                                                    <i className="bi bi-calendar3 me-1" style={{ color: '#8b5cf6' }}></i>
                                                    {formatDate(prescription.issueDate)}
                                                  </h6>
                                                  <span className="badge" style={{
                                                    background: '#f3e8ff',
                                                    color: '#7c3aed',
                                                    fontSize: '10px',
                                                    padding: '3px 8px',
                                                    fontWeight: '600',
                                                    border: '1px solid #d8b4fe'
                                                  }}>
                                                    {prescription.medications.length} Med{prescription.medications.length !== 1 ? 's' : ''}
                                                  </span>
                                                </div>
                                                <p className="mb-1" style={{ fontSize: '12px', color: '#64748b' }}>
                                                  <i className="bi bi-capsule-pill me-1" style={{ color: '#8b5cf6' }}></i>
                                                  {prescription.medications.map(m => m.medicationName).join(', ')}
                                                </p>
                                                <p className="mb-0" style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
                                                  <i className="bi bi-cursor me-1"></i>
                                                  Click to view details
                                                </p>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* View Details Button */}
                                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid #f1f5f9' }}>
                                    <button
                                      className="btn btn-sm"
                                      style={{
                                        background: 'linear-gradient(135deg, #00a08b 0%, #00c4ac 100%)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '6px 16px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        borderRadius: '6px'
                                      }}
                                      onClick={() => handleViewAppointment(appointment)}
                                    >
                                      <i className="bi bi-eye me-1"></i>
                                      View Full Details
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Medical Documents Section - Full Width */}
                <div className="admin-card mb-4">
                  <div className="card-header" style={{
                    background: '#ffffff',
                    color: '#0f172a',
                    borderRadius: '12px 12px 0 0',
                    padding: '20px',
                    borderBottom: '1px solid #f1f5f9'
                  }}>
                    <div className="d-flex justify-content-between align-items-center">
                      <h5 className="mb-0 d-flex align-items-center" style={{ fontWeight: '600', fontSize: '18px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: '#f0fdf9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: '12px',
                          color: '#16a34a'
                        }}>
                          <i className="bi bi-folder2-open"></i>
                        </div>
                        Medical Documents
                        {patientHistory.documentsByCategory && (
                          <span className="badge ms-2" style={{
                            fontSize: '12px',
                            background: '#f0fdf9',
                            color: '#16a34a',
                            border: '1px solid #b2ece3',
                            borderRadius: '6px',
                            padding: '5px 10px'
                          }}>
                            {patientHistory.documentsByCategory.reduce((sum, cat) => sum + cat.documentCount, 0)}
                          </span>
                        )}
                      </h5>
                      <select
                        className="form-select form-select-sm"
                        style={{
                          width: 'auto',
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          color: '#64748b',
                          fontSize: '13px',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                      >
                        <option value="all" style={{ color: '#0f172a' }}>All Categories</option>
                        {patientHistory.documentsByCategory && patientHistory.documentsByCategory.map((cat) => (
                          <option key={cat.category} value={cat.category} style={{ color: '#0f172a' }}>
                            {cat.category} ({cat.documentCount})
                          </option>
                        ))}

                      </select>
                    </div>
                  </div>
                  <div className="card-body" style={{ padding: '20px' }}>
                    {patientHistory.documentsByCategory && patientHistory.documentsByCategory.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {getFilteredDocuments().map((category, catIndex) => (
                          <div key={category.category} style={{
                            border: '1px solid #ccf3ed',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf9 100%)'
                          }}>
                            {/* Category Header */}
                            <div style={{
                              background: 'linear-gradient(135deg, #ecfdf5 0%, #ccf3ed 100%)',
                              padding: '12px 16px',
                              borderBottom: '1px solid #a7f3d0',
                              cursor: 'pointer'
                            }}
                              onClick={() => {
                                const collapseEl = document.getElementById(`collapse${catIndex}`);
                                if (collapseEl) {
                                  collapseEl.classList.toggle('show');
                                }
                              }}>
                              <div className="d-flex align-items-center justify-content-between">
                                <div className="d-flex align-items-center gap-2">
                                  <i className={`bi ${getCategoryIcon(category.category)}`} style={{ color: '#059669', fontSize: '18px' }}></i>
                                  <span style={{ fontWeight: '600', color: '#065f46', fontSize: '14px' }}>
                                    {category.category}
                                  </span>
                                  <span className="badge" style={{
                                    background: '#00c4ac',
                                    color: 'white',
                                    fontSize: '11px',
                                    padding: '3px 8px'
                                  }}>
                                    {category.documentCount}
                                  </span>
                                </div>
                                <i className="bi bi-chevron-down" style={{ color: '#059669', fontSize: '14px' }}></i>
                              </div>
                            </div>

                            {/* Documents List */}
                            <div
                              id={`collapse${catIndex}`}
                              className={`collapse ${catIndex === 0 ? 'show' : ''}`}
                            >
                              <div style={{ padding: '8px' }}>
                                {category.documents.map((doc, docIndex) => (
                                  <div
                                    key={doc.documentID}
                                    className="document-item"
                                    style={{
                                      padding: '12px',
                                      borderRadius: '6px',
                                      marginBottom: docIndex < category.documents.length - 1 ? '6px' : '0',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease',
                                      background: '#ffffff',
                                      border: '1px solid #e0f2fe'
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewDocument(doc);
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = '#f0f9ff';
                                      e.currentTarget.style.borderColor = '#bae6fd';
                                      e.currentTarget.style.transform = 'translateY(-2px)';
                                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = '#ffffff';
                                      e.currentTarget.style.borderColor = '#e0f2fe';
                                      e.currentTarget.style.transform = 'translateY(0)';
                                      e.currentTarget.style.boxShadow = 'none';
                                    }}
                                  >
                                    <div className="d-flex align-items-start gap-3">
                                      {/* File Icon */}
                                      <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '8px',
                                        background: '#f0f9ff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                      }}>
                                        <i className={`${getFileIcon(doc.documentType)}`} style={{ fontSize: '20px' }}></i>
                                      </div>

                                      {/* Document Info */}
                                      <div className="flex-grow-1">
                                        <h6 className="mb-1" style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>
                                          {doc.documentName}
                                        </h6>
                                        {doc.description && (
                                          <p className="mb-1" style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>
                                            {doc.description}
                                          </p>
                                        )}
                                        <div className="d-flex flex-wrap gap-2 mt-1">
                                          {doc.documentDate && (
                                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                              <i className="bi bi-calendar3 me-1"></i>
                                              {formatDate(doc.documentDate)}
                                            </span>
                                          )}
                                          {doc.performedBy && (
                                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                              <i className="bi bi-person me-1"></i>
                                              {doc.performedBy}
                                            </span>
                                          )}
                                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                            <i className="bi bi-upload me-1"></i>
                                            {formatDate(doc.uploadedAt)}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Arrow Icon */}
                                      <i className="bi bi-arrow-right-circle" style={{ color: '#00a08b', fontSize: '18px', flexShrink: 0 }}></i>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-muted py-4">
                        <i className="bi bi-file-earmark-x" style={{ fontSize: '48px' }}></i>
                        <p className="mt-2">No medical documents</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Document Viewer Modal */}
        {showDocumentModal && selectedDocument && (
          <div className="modal show d-block admin-modal-backdrop" tabIndex="-1">
            <div className="modal-dialog modal-xl modal-dialog-scrollable">
              <div className="modal-content" style={{ border: 'none', boxShadow: 'var(--shadow-lg)' }}>
                <div className="modal-header admin-modal-header primary" style={{ borderBottom: 'none' }}>
                  <h5 className="modal-title">
                    <i className={`${getFileIcon(selectedDocument.documentType)} me-2`}></i>
                    {selectedDocument.documentName}
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setShowDocumentModal(false)}
                  ></button>
                </div>
                <div className="modal-body admin-modal-body" style={{ backgroundColor: 'var(--admin-bg)' }}>
                  {/* Document Metadata */}
                  <div className="admin-card mb-3">
                    <div className="card-body">
                      <div className="row">
                        <div className="col-md-6">
                          <div className="admin-info-row">
                            <strong>Category:</strong>
                            <span>{selectedDocument.category || 'N/A'}</span>
                          </div>
                          <div className="admin-info-row">
                            <strong>Document Type:</strong>
                            <span>{selectedDocument.documentType}</span>
                          </div>
                          {selectedDocument.documentDate && (
                            <div className="admin-info-row">
                              <strong>Document Date:</strong>
                              <span>{formatDate(selectedDocument.documentDate)}</span>
                            </div>
                          )}
                        </div>
                        <div className="col-md-6">
                          {selectedDocument.performedBy && (
                            <div className="admin-info-row">
                              <strong>Performed By:</strong>
                              <span>{selectedDocument.performedBy}</span>
                            </div>
                          )}
                          <div className="admin-info-row">
                            <strong>Uploaded:</strong>
                            <span>{formatDateTime(selectedDocument.uploadedAt)}</span>
                          </div>
                        </div>
                      </div>
                      {selectedDocument.description && (
                        <div className="admin-info-row mt-2">
                          <strong>Description:</strong>
                          <span style={{ display: 'block', marginTop: '5px' }}>{selectedDocument.description}</span>
                        </div>
                      )}
                      {selectedDocument.testResults && (
                        <div className="admin-info-row mt-2">
                          <strong>Test Results:</strong>
                          <span style={{ display: 'block', marginTop: '5px' }}>{selectedDocument.testResults}</span>
                        </div>
                      )}
                      {selectedDocument.referenceRange && (
                        <div className="admin-info-row mt-2">
                          <strong>Reference Range:</strong>
                          <span>{selectedDocument.referenceRange}</span>
                        </div>
                      )}
                      {selectedDocument.testStatus && (
                        <div className="admin-info-row mt-2">
                          <strong>Test Status:</strong>
                          <span className={`badge ${selectedDocument.testStatus.toLowerCase() === 'normal' ? 'bg-success' :
                            selectedDocument.testStatus.toLowerCase() === 'abnormal' ? 'bg-warning' :
                              selectedDocument.testStatus.toLowerCase() === 'critical' ? 'bg-danger' : 'bg-secondary'
                            }`}>{selectedDocument.testStatus}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Document Preview */}
                  <div className="admin-card">
                    <div className="card-body text-center">
                      {loadingDocument ? (
                        <div className="py-5">
                          <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                          </div>
                          <p className="mt-3 text-muted">Loading document preview...</p>
                        </div>
                      ) : (() => {
                        const type = selectedDocument.documentType?.toLowerCase() || '';

                        // Image preview
                        if (type.includes('image') || type.includes('jpg') || type.includes('png') ||
                          type.includes('jpeg') || type.includes('gif') || type.includes('bmp')) {
                          return documentPreviewUrl ? (
                            <img
                              src={documentPreviewUrl}
                              alt={selectedDocument.documentName}
                              style={{ maxWidth: '100%', maxHeight: '600px', objectFit: 'contain' }}
                            />
                          ) : (
                            <div className="text-muted py-5">
                              <i className="bi bi-exclamation-triangle" style={{ fontSize: '64px', color: '#dc3545' }}></i>
                              <p className="mt-3">Unable to load image preview</p>
                              <p className="text-muted small">The image may be corrupted or in an unsupported format</p>
                            </div>
                          );
                        }

                        // PDF preview
                        if (type.includes('pdf')) {
                          return documentPreviewUrl ? (
                            <iframe
                              src={documentPreviewUrl}
                              style={{ width: '100%', height: '600px', border: 'none' }}
                              title={selectedDocument.documentName}
                            />
                          ) : (
                            <div className="text-muted py-5">
                              <i className="bi bi-exclamation-triangle" style={{ fontSize: '64px', color: '#dc3545' }}></i>
                              <p className="mt-3">Unable to load PDF preview</p>
                              <p className="text-muted small">Please download the file to view it</p>
                            </div>
                          );
                        }

                        // Text file preview
                        if (type.includes('text') || type.includes('txt')) {
                          return documentTextContent ? (
                            <div style={{
                              textAlign: 'left',
                              maxHeight: '600px',
                              overflowY: 'auto',
                              backgroundColor: '#f8f9fa',
                              padding: '20px',
                              borderRadius: '8px',
                              fontFamily: 'monospace',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word'
                            }}>
                              {documentTextContent}
                            </div>
                          ) : (
                            <div className="text-muted py-5">
                              <i className="bi bi-exclamation-triangle" style={{ fontSize: '64px', color: '#dc3545' }}></i>
                              <p className="mt-3">Unable to load text preview</p>
                              <p className="text-muted small">The file may be empty or corrupted</p>
                            </div>
                          );
                        }

                        // Video preview
                        if (type.includes('video') || type.includes('mp4') || type.includes('avi') ||
                          type.includes('mov') || type.includes('webm') || type.includes('mkv')) {
                          return documentPreviewUrl ? (
                            <video
                              controls
                              style={{ maxWidth: '100%', maxHeight: '600px' }}
                              preload="metadata"
                            >
                              <source src={documentPreviewUrl} type={selectedDocument.documentType || 'video/mp4'} />
                              Your browser does not support the video tag.
                            </video>
                          ) : (
                            <div className="text-muted py-5">
                              <i className="bi bi-exclamation-triangle" style={{ fontSize: '64px', color: '#dc3545' }}></i>
                              <p className="mt-3">Unable to load video preview</p>
                              <p className="text-muted small">Please download the file to view it</p>
                            </div>
                          );
                        }

                        // Audio preview
                        if (type.includes('audio') || type.includes('mp3') || type.includes('wav') ||
                          type.includes('ogg') || type.includes('m4a')) {
                          return documentPreviewUrl ? (
                            <div className="py-5">
                              <i className="bi bi-file-music text-info" style={{ fontSize: '64px' }}></i>
                              <h5 className="mt-3 mb-4">{selectedDocument.documentName}</h5>
                              <audio
                                controls
                                style={{ width: '100%', maxWidth: '500px' }}
                                preload="metadata"
                              >
                                <source src={documentPreviewUrl} type={selectedDocument.documentType || 'audio/mpeg'} />
                                Your browser does not support the audio tag.
                              </audio>
                            </div>
                          ) : (
                            <div className="text-muted py-5">
                              <i className="bi bi-exclamation-triangle" style={{ fontSize: '64px', color: '#dc3545' }}></i>
                              <p className="mt-3">Unable to load audio preview</p>
                              <p className="text-muted small">Please download the file to view it</p>
                            </div>
                          );
                        }

                        // Unsupported file type - show download option
                        return (
                          <div className="text-muted py-5">
                            <i className={`${getFileIcon(selectedDocument.documentType)} fs-1 mb-3`}></i>
                            <h5 className="mt-3">{selectedDocument.documentName}</h5>
                            <p className="text-muted">Preview not available for this file type</p>
                            <button
                              onClick={() => handleDownloadDocument(selectedDocument.documentID, selectedDocument.documentName)}
                              className="btn btn-primary mt-2"
                            >
                              <i className="bi bi-download me-2"></i>
                              Download File to View
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
                <div className="admin-modal-footer">
                  <button
                    onClick={() => handleDownloadDocument(selectedDocument.documentID, selectedDocument.documentName)}
                    className="admin-btn-modal primary"
                  >
                    <i className="bi bi-download"></i>
                    Download
                  </button>
                  <button
                    type="button"
                    className="admin-btn-modal secondary"
                    onClick={() => setShowDocumentModal(false)}
                  >
                    <i className="bi bi-x-circle"></i>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Appointment Detail Modal */}
        {showAppointmentModal && selectedAppointment && (
          <div className="modal show d-block admin-modal-backdrop" tabIndex="-1">
            <div className="modal-dialog modal-lg modal-dialog-scrollable">
              <div className="modal-content" style={{ border: 'none', boxShadow: 'var(--shadow-lg)' }}>
                <div className="modal-header admin-modal-header primary" style={{ borderBottom: 'none' }}>
                  <h5 className="modal-title">
                    <i className="bi bi-calendar-event me-2"></i>
                    Appointment Details
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setShowAppointmentModal(false)}
                  ></button>
                </div>
                <div className="modal-body admin-modal-body" style={{ backgroundColor: 'var(--admin-bg)' }}>
                  {/* Appointment Overview */}
                  <div className="admin-card mb-3">
                    <div className="card-body">
                      <div className="row">
                        <div className="col-md-6">
                          <div className="admin-info-row">
                            <strong>Appointment ID:</strong>
                            <span>#{selectedAppointment.appointmentID}</span>
                          </div>
                          <div className="admin-info-row">
                            <strong>Date & Time:</strong>
                            <span>{formatDateTime(selectedAppointment.appointmentTime)}</span>
                          </div>
                          <div style={{ marginBottom: '16px', padding: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ color: '#0f172a', fontWeight: '600', minWidth: '140px' }}>Consultation Type:</strong>
                            <span className="badge" style={{
                              background: 'linear-gradient(135deg, #00a08b 0%, #00c4ac 100%)',
                              color: 'white',
                              padding: '6px 14px',
                              fontSize: '13px',
                              fontWeight: '600',
                              borderRadius: '6px',
                              boxShadow: '0 2px 4px rgba(0, 160, 139, 0.2)'
                            }}>
                              <i className="bi bi-clipboard-pulse me-1"></i>
                              {selectedAppointment.consultationType}
                            </span>
                          </div>
                          <div style={{ marginBottom: '16px', padding: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ color: '#0f172a', fontWeight: '600', minWidth: '140px' }}>Status:</strong>
                            <span className={`badge`} style={{
                              background: selectedAppointment.status === 'Completed' ? 'linear-gradient(135deg, #00c4ac 0%, #059669 100%)' :
                                selectedAppointment.status === 'Scheduled' ? 'linear-gradient(135deg, #00a08b 0%, #00c4ac 100%)' :
                                  'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                              color: 'white',
                              padding: '6px 14px',
                              fontSize: '13px',
                              fontWeight: '600',
                              borderRadius: '6px',
                              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)'
                            }}>
                              <i className={`bi ${selectedAppointment.status === 'Completed' ? 'bi-check-circle' :
                                selectedAppointment.status === 'Scheduled' ? 'bi-clock' :
                                  'bi-x-circle'} me-1`}></i>
                              {selectedAppointment.status}
                            </span>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="admin-info-row">
                            <strong>Doctor:</strong>
                            <span>Dr. {selectedAppointment.doctorName}</span>
                          </div>
                          <div className="admin-info-row">
                            <strong>Specialty:</strong>
                            <span>{selectedAppointment.doctorSpecialty}</span>
                          </div>
                          <div className="admin-info-row">
                            <strong>Doctor ID:</strong>
                            <span className="text-muted" style={{ fontSize: '12px' }}>
                              {selectedAppointment.doctorID.substring(0, 12)}...
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Patient Information */}
                  {patientHistory && (
                    <div className="admin-card mb-3">
                      <div className="card-body">
                        <h6 className="mb-3">
                          <i className="bi bi-person me-2 text-primary"></i>
                          Patient Information
                        </h6>
                        <div className="row">
                          <div className="col-md-6">
                            <div className="admin-info-row">
                              <strong>Name:</strong>
                              <span>{patientHistory.fullName}</span>
                            </div>
                            <div className="admin-info-row">
                              <strong>Email:</strong>
                              <span>{patientHistory.email}</span>
                            </div>
                            <div className="admin-info-row">
                              <strong>Phone:</strong>
                              <span>{patientHistory.phoneNumber || 'N/A'}</span>
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="admin-info-row">
                              <strong>Gender:</strong>
                              <span>{patientHistory.gender || 'N/A'}</span>
                            </div>
                            <div className="admin-info-row">
                              <strong>Blood Type:</strong>
                              <span>{patientHistory.bloodType || 'N/A'}</span>
                            </div>
                            <div className="admin-info-row">
                              <strong>Date of Birth:</strong>
                              <span>{formatDate(patientHistory.dateOfBirth)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Diagnosis - PRIORITY DISPLAY */}
                  {selectedAppointment.diagnosis && (
                    <div className="admin-card mb-3">
                      <div className="card-body" style={{ padding: '20px' }}>
                        <h6 className="mb-3" style={{ fontSize: '16px', fontWeight: '700' }}>
                          <i className="bi bi-clipboard2-pulse-fill me-2" style={{ color: '#14b8a6', fontSize: '20px' }}></i>
                          Diagnosis
                        </h6>
                        <div className="alert mb-0" style={{
                          background: 'linear-gradient(135deg, #f0fdf9 0%, #ccf3ed 100%)',
                          borderColor: '#14b8a6',
                          borderLeft: '5px solid #14b8a6',
                          color: '#0f172a',
                          fontSize: '15px',
                          fontWeight: '500',
                          lineHeight: '1.7',
                          padding: '16px',
                          boxShadow: '0 2px 8px rgba(20, 184, 166, 0.15)'
                        }}>
                          <i className="bi bi-clipboard2-pulse-fill me-2" style={{ color: '#008f7d', fontSize: '16px' }}></i>
                          {selectedAppointment.diagnosis}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Doctor Notes - Secondary */}
                  {selectedAppointment.doctorNotes && (
                    <div className="admin-card mb-3">
                      <div className="card-body" style={{ padding: '16px' }}>
                        <h6 className="mb-2" style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280' }}>
                          <i className="bi bi-journal-text me-2" style={{ fontSize: '14px' }}></i>
                          Doctor's Notes
                        </h6>
                        <div className="alert mb-0" style={{
                          backgroundColor: '#f9fafb',
                          borderColor: '#e5e7eb',
                          borderLeft: '3px solid #d1d5db',
                          color: '#6b7280',
                          fontSize: '13px',
                          lineHeight: '1.5',
                          padding: '12px'
                        }}>
                          <i className="bi bi-journal-text me-2" style={{ fontSize: '13px' }}></i>
                          {selectedAppointment.doctorNotes}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="admin-modal-footer">
                  <button
                    type="button"
                    className="admin-btn-modal secondary"
                    onClick={() => setShowAppointmentModal(false)}
                  >
                    <i className="bi bi-x-circle"></i>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Prescription Detail Modal */}
        {showPrescriptionModal && selectedPrescription && (
          <div className="modal show d-block admin-modal-backdrop" tabIndex="-1">
            <div className="modal-dialog modal-lg modal-dialog-scrollable">
              <div className="modal-content" style={{ border: 'none', boxShadow: 'var(--shadow-lg)' }}>
                <div className="modal-header admin-modal-header" style={{
                  background: 'linear-gradient(135deg, #c8b5f5ff 0%, #9f74e8ff 100%)',
                  color: 'white',
                  borderBottom: 'none'
                }}>
                  <h5 className="modal-title">
                    <i className="bi bi-prescription2 me-2"></i>
                    Prescription Details
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setShowPrescriptionModal(false)}
                  ></button>
                </div>
                <div className="modal-body admin-modal-body" style={{ backgroundColor: 'var(--admin-bg)' }}>
                  {/* Prescription Overview */}
                  <div className="admin-card mb-3">
                    <div className="card-body">
                      <div className="row">
                        <div className="col-md-6">
                          <div className="admin-info-row">
                            <strong>Prescription ID:</strong>
                            <span>#{selectedPrescription.prescriptionHeaderID}</span>
                          </div>
                          <div className="admin-info-row">
                            <strong>Issue Date:</strong>
                            <span>{formatDate(selectedPrescription.issueDate)}</span>
                          </div>
                          <div className="admin-info-row">
                            <strong>Appointment ID:</strong>
                            <span>#{selectedPrescription.appointmentID}</span>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="admin-info-row">
                            <strong>Doctor:</strong>
                            <span>Dr. {selectedPrescription.doctorName}</span>
                          </div>
                          <div className="admin-info-row">
                            <strong>Specialty:</strong>
                            <span>{selectedPrescription.specialty || 'General Practice'}</span>
                          </div>
                          <div className="admin-info-row">
                            <strong>Total Medications:</strong>
                            <span className="badge bg-purple">{selectedPrescription.medications.length}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Medications Table */}
                  <div className="admin-card">
                    <div className="card-body">
                      <h6 className="mb-3">
                        <i className="bi bi-capsule me-2 text-purple"></i>
                        Prescribed Medications
                      </h6>
                      <div className="table-responsive">
                        <table className="table table-hover">
                          <thead style={{ backgroundColor: '#faf5ff' }}>
                            <tr>
                              <th style={{ fontSize: '13px', fontWeight: '600', color: '#7c3aed' }}>#</th>
                              <th style={{ fontSize: '13px', fontWeight: '600', color: '#7c3aed', minWidth: "140px" }}>Medication Name</th>
                              <th style={{ fontSize: '13px', fontWeight: '600', color: '#7c3aed', minWidth: "140px" }}>Dosage - Quantity</th>
                              <th style={{ fontSize: '13px', fontWeight: '600', color: '#7c3aed', textAlign: "center" }}>Instructions</th>
                              <th style={{ fontSize: '13px', fontWeight: '600', color: '#7c3aed', minWidth: "140px" }}>Supply Days</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedPrescription.medications.map((med, index) => (
                              <tr key={med.prescriptionItemID}>
                                <td style={{ fontSize: '13px' }}>{index + 1}</td>
                                <td style={{ fontSize: '13px', fontWeight: '600' }}>
                                  <i className="bi bi-capsule-pill me-1 text-purple"></i>
                                  {med.medicationName}
                                </td>
                                <td style={{ fontSize: '13px' }}>
                                  <span className="badge" style={{
                                    background: 'rgba(139, 92, 246, 0.1)',
                                    color: '#7c3aed',
                                    fontWeight: '500'
                                  }}>
                                    {med.dosage}
                                  </span>
                                </td>
                                <td style={{ fontSize: '13px' }}>{med.instructions}</td>
                                <td style={{ fontSize: '13px' }}>
                                  <span className="badge bg-info">{med.totalSupplyDays} days</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="admin-modal-footer">
                  <button
                    type="button"
                    className="admin-btn-modal secondary"
                    onClick={() => setShowPrescriptionModal(false)}
                  >
                    <i className="bi bi-x-circle"></i>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </NavbarAdmin>
  );
}
