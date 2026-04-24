import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../components/Css/DoctorPage.css';
import CreatePrescriptionModal from './CreatePrescriptionModal';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { appointmentService } from '../api/appointmentApi';
import { toast } from 'react-toastify';
import SharedRecordsView from './SharedRecordsView';

const DoctorAppointmentDetail = ({ appointment, patient, onBack }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [medicalHistory, setMedicalHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedCards, setExpandedCards] = useState({});
  const [selectedHistoryAppointment, setSelectedHistoryAppointment] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [completingAppointment, setCompletingAppointment] = useState(false);
  const [showCompleteConfirmModal, setShowCompleteConfirmModal] = useState(false);
  const { roles, initiateCall } = useAuth();
  const { openChatWith } = useChat();
  const [filteredSharedRecords, setFilteredSharedRecords] = useState([]);
  const [activeTab, setActiveTab] = useState('timeline');

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Helper function to format time
  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Helper function to calculate age
  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return 'N/A';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Fetch patient medical history
  useEffect(() => {
    const fetchMedicalHistory = async () => {
      if (!patient?.patientID) return;

      setLoadingHistory(true);
      try {
        const data = await appointmentService.getPatientMedicalHistory(patient.patientID);
        setMedicalHistory(data);
      } catch (error) {
        console.error('Error fetching patient medical history:', error);
        toast.error('Failed to load patient medical history');
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchMedicalHistory();
  }, [patient?.patientID]);

  // Toggle card expansion
  const toggleCardExpand = (appointmentId) => {
    setExpandedCards(prev => ({
      ...prev,
      [appointmentId]: !prev[appointmentId]
    }));
  };

  // Format status badge color
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed': return 'bg-success';
      case 'Scheduled': return 'bg-warning';
      case 'Cancelled': return 'bg-danger';
      default: return 'bg-secondary';
    }
  };

  // Handle view appointment detail from medical history
  const handleViewAppointmentDetail = async (appointmentId) => {
    try {
      const appointmentDetail = await appointmentService.getAppointmentDetail(appointmentId);
      setSelectedHistoryAppointment(appointmentDetail);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error loading appointment detail:', error);
      toast.error('Failed to load appointment details');
    }
  };

  // Handle complete appointment
  const handleCompleteAppointment = async () => {
    setCompletingAppointment(true);
    setShowCompleteConfirmModal(false);
    try {
      await appointmentService.completeAppointment(appointment.appointmentID);
      toast.success('Appointment marked as completed successfully');
      // Reload appointment data
      if (onBack) {
        setTimeout(() => onBack(), 1000);
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error completing appointment:', error);
      toast.error('Failed to complete appointment');
    } finally {
      setCompletingAppointment(false);
    }
  };

  if (!appointment || !patient) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  const handleChat = async (appointment) => {
    const isDoctor = roles && roles.some(r => String(r).trim().toLowerCase() === 'doctor');
    const partnerData = isDoctor ? appointment.patient : appointment.doctor;
    const partnerID = isDoctor ? appointment.patient?.patientID : appointment.doctorID;  // ← SỬA ĐÂY

    if (!partnerData || !partnerID) {
      alert("Chat partner information is missing.");
      return;
    }

    let firebaseID;
    if (partnerID.includes('-')) {
      // Has dashes: CHỈ remove last 4 chars, GIỮ NGUYÊN dấu gạch ngang
      firebaseID = partnerID.substring(0, partnerID.length - 4);  // ← SỬA ĐÂY
    } else {
      // No dashes: remove last 5 chars directly
      firebaseID = partnerID.substring(0, partnerID.length - 5);
    }

    console.log(`[Chat] Opening chat with ${isDoctor ? 'Patient' : 'Doctor'}`);

    try {
      const usersRef = collection(db, "users");

      // Try as document ID first
      let q = query(usersRef, where("__name__", "==", firebaseID));
      let querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const partnerUser = { ...querySnapshot.docs[0].data(), uid: querySnapshot.docs[0].id };
        openChatWith(partnerUser);
        return;
      }

      // Try as uid field
      q = query(usersRef, where("uid", "==", firebaseID));
      querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const partnerUser = { ...querySnapshot.docs[0].data(), uid: querySnapshot.docs[0].id };
        console.log(`[Chat] ✓ Found by uid field:`, partnerUser);
        openChatWith(partnerUser);
        return;
      }

      console.warn(`[Chat] ✗ Could not find user with Firebase ID: ${firebaseID}`);
      alert(`Could not find chat user. They may not have registered in the chat system yet.`);
    } catch (error) {
      console.error("[Chat] Error:", error);
      alert("Error initiating chat.");
    }
  };

  const handleVideoCall = async (appointment) => {
    try {
      // Lấy thông tin từ appointment (patientID và doctorID nằm trong nested objects)
      const patientID = appointment.patient?.patientID || appointment.patientID;
      const doctorID = appointment.doctorID;
      const patientName = appointment.patient?.fullName || "Patient";
      const doctorName = appointment.doctor?.fullName || "Doctor";

      // Kiểm tra xem user hiện tại là ai
      const isDoctor = roles && roles.some(r => String(r).trim().toLowerCase() === 'doctor');

      // Xác định target user (người được gọi)
      const targetUserId = isDoctor ? patientID : doctorID;
      const targetUserName = isDoctor ? patientName : doctorName;

      // Tạo Room ID bằng cách trộn DoctorID + PatientID và lấy 40 ký tự
      // const combinedId = doctorID + patientID;
      // const roomId = combinedId.substring(0, 40);

      // Tạo Room ID ngẫu nhiên 45 ký tự
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let roomId = '';
      for (let i = 0; i < 45; i++) {
        roomId += characters.charAt(Math.floor(Math.random() * characters.length));
      }

      console.log('Video Call Info:', {
        patientID,
        doctorID,
        patientName,
        doctorName,
        roomId,
        targetUserId,
        targetUserName
      });

      // Lấy tên bác sĩ hiện tại
      const currentDoctorName = doctorName || "Doctor";

      // Gọi hàm initiateCall với thông tin đầy đủ (bao gồm tên bác sĩ)
      initiateCall(targetUserId, roomId, targetUserName, currentDoctorName);

    } catch (error) {
      console.error("Error initiating video call:", error);
      alert("Unable to start video call.");
    }
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      {/* Header (Toolbar & Breadcrumbs) */}
      <header className="d-flex align-items-center justify-content-center border-bottom border-border-light bg-content-light" style={{ height: '4rem' }}>
        <div className="d-flex w-100" style={{ maxWidth: '1280px', paddingLeft: '1rem', paddingRight: '1rem' }}>
          {/* Breadcrumbs */}
          <div className="d-flex flex-wrap align-items-center gap-2">
            <button
              className="p-2 text-text-light-secondary border-0 bg-transparent"
              onClick={() => onBack ? onBack() : navigate('/doctor-page')}
              style={{ cursor: 'pointer' }}
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <a className="text-text-light-secondary small fw-medium text-decoration-none" href="#" onClick={(e) => { e.preventDefault(); onBack ? onBack() : navigate('/doctor-page'); }}>
              Appointments List
            </a>
            <span className="text-text-light-secondary small fw-medium">/</span>
            <span className="text-text-light-primary small fw-medium">Appointment Details</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow-1 d-flex justify-content-center p-4 p-md-5">
        <div className="w-100" style={{ maxWidth: '1280px' }}>
          <div className="row g-4">

            {/* Main Column */}
            <div className="col-12 d-flex flex-column gap-4">

              {/* ProfileHeader */}
              <div className="rounded-3 border border-border-light bg-content-light shadow-sm">
                <div className="p-4 p-md-4">
                  <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-md-between gap-4">
                    <div className="d-flex align-items-center gap-4">
                      <div className="profile-avatar"></div>
                      <div className="d-flex flex-column justify-content-center">
                        <p className="text-text-light-primary fs-5 fw-bold mb-0">{patient.fullName || 'N/A'}</p>
                        <p className="text-text-light-secondary small mb-1">
                          {calculateAge(patient.dateOfBirth)} years old
                        </p>
                        <p className="text-text-light-secondary small mb-0">
                          {patient.user?.email || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Appointment Details & Actions */}
              <div className="rounded-3 border border-border-light bg-content-light shadow-sm">
                <div className="border-bottom border-border-light p-4 p-md-4">
                  <h2 className="fs-5 fw-bold text-text-light-primary mb-0">Appointment Details</h2>
                </div>
                {/* DescriptionList */}
                <div className="p-4 p-md-4 row g-0 text-sm">
                  <div className="col-5 col-md-3 mb-3 text-text-light-secondary">Date and Time</div>
                  <div className="col-7 col-md-9 mb-3 text-text-light-primary fw-medium">
                    {formatTime(appointment.appointmentTime)} - {formatDate(appointment.appointmentTime)}
                  </div>
                  <div className="col-5 col-md-3 mb-3 text-text-light-secondary">Type</div>
                  <div className="col-7 col-md-9 mb-3 text-text-light-primary fw-medium">
                    {appointment.consultationType || 'N/A'}
                  </div>

                  <div className="col-5 col-md-3 mb-3 text-text-light-secondary">Status</div>
                  <div className="col-7 col-md-9 mb-3 d-flex align-items-center gap-2">
                    <div className={`rounded-circle ${appointment.status === 'Scheduled' ? 'bg-warning' :
                      appointment.status === 'Completed' ? 'bg-success' :
                        appointment.status === 'Cancelled' ? 'bg-danger' :
                          'bg-secondary'
                      }`} style={{ height: '0.625rem', width: '0.625rem' }}></div>
                    <p className="text-text-light-primary fw-medium mb-0">{appointment.status || 'N/A'}</p>
                  </div>

                  <div className="col-5 col-md-3 text-text-light-secondary">Reason for Visit</div>
                  <div className="col-7 col-md-9 text-text-light-primary fw-medium">
                    {appointment.reason || 'No reason provided'}
                  </div>
                </div>
                {/* ButtonGroup */}
                <div className="d-flex flex-column flex-md-row gap-3 p-4 pt-0 p-md-4 pt-md-2">
                  <button
                    className="btn btn-primary h-auto py-3 fw-bold flex-fill"
                    onClick={() => {
                      if (appointment.consultationType === 'Video Call') {
                        handleVideoCall(appointment);
                      } else if (appointment.consultationType === 'Audio Call') {
                        handleVideoCall(appointment); // Audio cũng dùng Zego
                      } else if (appointment.consultationType === 'Chat') {
                        handleChat(appointment);
                      } else {
                        alert('Unknown consultation type');
                      }
                    }}
                    title={new Date(appointment.appointmentTime) < new Date() ? "Appointment time has passed" : `Join ${appointment.consultationType}`}
                    disabled={appointment.status !== 'Scheduled' || new Date(appointment.appointmentTime) < new Date()}
                  >
                    <i className={`bi ${appointment.consultationType === 'Video Call' ? 'bi-camera-video' :
                      appointment.consultationType === 'Audio Call' ? 'bi-telephone' :
                        appointment.consultationType === 'Chat' ? 'bi-chat-dots' :
                          'bi-door-open'
                      } me-2`}></i>
                    Join {appointment.consultationType || 'Appointment'}
                  </button>
                  <button
                    className="btn btn-secondary-custom h-auto py-3 fw-bold flex-fill"
                    onClick={() => setIsPrescriptionModalOpen(true)}
                  >
                    Prescribe Medication
                  </button>
                  <button
                    className="btn btn-success h-auto py-3 fw-bold flex-fill"
                    onClick={() => setShowCompleteConfirmModal(true)}
                    disabled={appointment.status !== 'Scheduled' || completingAppointment}
                    title={appointment.status !== 'Scheduled' ? "Can only complete scheduled appointments" : "Mark appointment as completed"}
                  >
                    <i className="bi bi-check-circle me-2"></i>
                    {completingAppointment ? 'Completing...' : 'Complete'}
                  </button>
                </div>
              </div>
            </div>

            {/* Combined Medical Records Section with Tabs */}
<div className="col-12">
  <div className="rounded-3 border border-border-light bg-content-light shadow-sm">
    {/* Header with Tabs */}
    <div className="border-bottom border-border-light p-4">
      <h2 className="fs-5 fw-bold text-text-light-primary mb-3">
        <i className="bi bi-folder2-open me-2"></i>Patient Medical Information
      </h2>
      
      {/* Tab Navigation */}
      <ul className="nav nav-tabs border-0">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'timeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('timeline')}
            style={{
              border: 'none',
              borderBottom: activeTab === 'timeline' ? '2px solid #0d6efd' : '2px solid transparent',
              background: 'transparent',
              color: activeTab === 'timeline' ? '#0d6efd' : '#6c757d',
              fontWeight: activeTab === 'timeline' ? 'bold' : 'normal'
            }}
          >
            <i className="bi bi-clipboard2-pulse me-2"></i>
            Medical Record Timeline
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'shared' ? 'active' : ''}`}
            onClick={() => setActiveTab('shared')}
            style={{
              border: 'none',
              borderBottom: activeTab === 'shared' ? '2px solid #0d6efd' : '2px solid transparent',
              background: 'transparent',
              color: activeTab === 'shared' ? '#0d6efd' : '#6c757d',
              fontWeight: activeTab === 'shared' ? 'bold' : 'normal'
            }}
          >
            <i className="bi bi-folder-open me-2"></i>
            Shared Health Records
          </button>
        </li>
      </ul>
    </div>

    {/* Tab Content */}
    <div className="p-4">
      {/* Timeline Tab Content */}
      {activeTab === 'timeline' && (
        <div>
          {loadingHistory ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="text-text-light-secondary mt-3 mb-0">Loading medical history...</p>
            </div>
          ) : medicalHistory?.appointments && medicalHistory.appointments.length > 0 ? (
            <div className="d-flex flex-column gap-3">

              <div className="rounded-3 border border-border-light bg-content-light shadow-sm">
                <div className="border-bottom border-border-light p-4">
                  <h2 className="fs-5 fw-bold text-text-light-primary mb-0">
                    <i className="bi bi-clipboard2-pulse me-2"></i>Medical Record Timeline
                  </h2>
                </div>
                <div className="p-4">
                  {loadingHistory ? (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <p className="text-text-light-secondary mt-3 mb-0">Loading medical history...</p>
                    </div>
                  ) : medicalHistory?.appointments && medicalHistory.appointments.length > 0 ? (
                    <div className="d-flex flex-column gap-3">
                      {medicalHistory.appointments
                        .filter(apt => apt.status === 'Completed')
                        .map((apt) => (
                          <div key={apt.appointmentID} className="card border hover-shadow transition-all rounded-3">
                            <div className="card-body">
                              {/* Header row: Date + Status & Type + Action Button */}
                              <div className="row align-items-start g-3 mb-3">
                                {/* Date, Status, Type, Doctor */}
                                <div className="col">
                                  <h5 className="fw-bold text-dark mb-2">
                                    {formatDate(apt.appointmentTime)}
                                  </h5>
                                  <div className="d-flex gap-2 align-items-center mb-2">
                                    <span className={`badge rounded-pill ${getStatusBadge(apt.status)}`}>
                                      {apt.status}
                                    </span>
                                    <span className="badge bg-light text-dark border">
                                      {apt.consultationType}
                                    </span>
                                  </div>
                                  {/* Doctor Info */}
                                  <h6 className="fw-bold text-primary mb-0">
                                    Dr. {apt.doctorName} - <span className="text-muted fw-normal">{apt.doctorSpecialty}</span>
                                  </h6>
                                </div>

                                {/* Action Button */}
                                <div className="col-auto">
                                  <button
                                    className="btn btn-outline-primary btn-sm rounded-pill px-3"
                                    onClick={() => handleViewAppointmentDetail(apt.appointmentID)}
                                  >
                                    More Info <i className="bi bi-chevron-right ms-1 small"></i>
                                  </button>
                                </div>
                              </div>

                              {/* Diagnosis */}
                              {apt.consultation && apt.consultation.diagnosis && (
                                <div className="mb-3 p-3 bg-info-subtle rounded-3 border-start border-info border-4">
                                  <div className="d-flex align-items-center mb-2">
                                    <i className="bi bi-clipboard2-pulse fs-5 text-info me-2"></i>
                                    <strong className="text-info text-uppercase small">Diagnosis</strong>
                                  </div>
                                  <p className="mb-0 fs-6 fw-semibold text-dark">
                                    {apt.consultation.diagnosis.length > 100 && !expandedCards[apt.appointmentID]
                                      ? apt.consultation.diagnosis.substring(0, 100) + '...'
                                      : apt.consultation.diagnosis
                                    }
                                  </p>
                                  {apt.consultation.diagnosis.length > 100 && (
                                    <button
                                      className="btn btn-link btn-sm p-0 mt-1 text-info text-decoration-none"
                                      onClick={() => toggleCardExpand(apt.appointmentID)}
                                    >
                                      {expandedCards[apt.appointmentID] ? (
                                        <><i className="bi bi-chevron-up me-1"></i>Show less</>
                                      ) : (
                                        <><i className="bi bi-chevron-down me-1"></i>Show more</>
                                      )}
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* Prescription */}
                              {apt.prescription && apt.prescription.medications && apt.prescription.medications.length > 0 && (
                                <div className="p-3 bg-success-subtle rounded-3 border-start border-success border-4">
                                  <div className="d-flex align-items-center mb-2">
                                    <i className="bi bi-capsule fs-5 text-success me-2"></i>
                                    <strong className="text-success text-uppercase small">
                                      Prescription ({apt.prescription.medicationCount} medications)
                                    </strong>
                                  </div>
                                  <ul className="list-unstyled mb-0">
                                    {(expandedCards[apt.appointmentID]
                                      ? apt.prescription.medications
                                      : apt.prescription.medications.slice(0, 3)
                                    ).map((med, i) => (
                                      <li key={i} className="text-dark mb-2 pb-2 border-bottom border-success border-opacity-25">
                                        <div className="d-flex align-items-start">
                                          <i className="bi bi-capsule-pill text-success me-2 mt-1"></i>
                                          <div className="flex-grow-1">
                                            <div className="fw-semibold text-dark">{med.medicationName}</div>
                                            <div className="small text-muted mt-1">
                                              <span className="badge bg-success-subtle text-success me-2">
                                                {med.dosage}
                                              </span>
                                              <span>{med.instructions}</span>
                                            </div>
                                            <div className="small text-muted mt-1">
                                              <i className="bi bi-calendar-check me-1"></i>
                                              {med.totalSupplyDays} days supply
                                            </div>
                                          </div>
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                  {apt.prescription.medications.length > 3 && (
                                    <button
                                      className="btn btn-link btn-sm p-0 mt-2 text-success text-decoration-none"
                                      onClick={() => toggleCardExpand(apt.appointmentID)}
                                    >
                                      {expandedCards[apt.appointmentID] ? (
                                        <><i className="bi bi-chevron-up me-1"></i>Show less</>
                                      ) : (
                                        <><i className="bi bi-chevron-down me-1"></i>Show all {apt.prescription.medicationCount} medications</>
                                      )}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-5">
                      <i className="bi bi-inbox fs-1 text-muted d-block mb-3"></i>
                      <p className="text-text-light-secondary mb-0">No completed appointments found for this patient</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-5">
              <i className="bi bi-inbox fs-1 text-muted d-block mb-3"></i>
              <p className="text-text-light-secondary mb-0">No completed appointments found for this patient</p>
            </div>
          )}
        </div>
      )}

      {/* Shared Records Tab Content */}
      {activeTab === 'shared' && (
        <div>
          <p className="text-text-light-secondary small mb-3">
            Medical documents shared by {patient.fullName}
          </p>
          <SharedRecordsView patientFilter={patient.patientID} />
        </div>
      )}
    </div>
  </div>
</div>
          </div>
        </div>
      </main>

      {/* Prescription Modal */}
      <CreatePrescriptionModal
        isOpen={isPrescriptionModalOpen}
        onClose={() => setIsPrescriptionModalOpen(false)}
        appointment={appointment}
        patient={patient}
      />

      {/* Appointment Detail Modal */}
      {showDetailModal && selectedHistoryAppointment && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-info-circle-fill me-2"></i>Appointment Details
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowDetailModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {/* Basic Info */}
                <div className="mb-4">
                  <h6 className="fw-bold text-primary mb-3">
                    <i className="bi bi-calendar-event me-2"></i>Basic Information
                  </h6>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <p className="mb-1 text-muted small">Date & Time</p>
                      <p className="fw-semibold">{formatDate(selectedHistoryAppointment.appointmentTime)}</p>
                    </div>
                    <div className="col-md-6">
                      <p className="mb-1 text-muted small">Consultation Type</p>
                      <p className="fw-semibold">{selectedHistoryAppointment.consultationType}</p>
                    </div>
                    <div className="col-md-6">
                      <p className="mb-1 text-muted small">Status</p>
                      <span className={`badge ${getStatusBadge(selectedHistoryAppointment.status)}`}>
                        {selectedHistoryAppointment.status}
                      </span>
                    </div>
                    <div className="col-md-6">
                      <p className="mb-1 text-muted small">Doctor</p>
                      <p className="fw-semibold">{selectedHistoryAppointment.doctorName}</p>
                      <p className="text-muted small">{selectedHistoryAppointment.doctorSpecialty}</p>
                    </div>
                  </div>
                </div>

                {/* Consultation Details */}
                {selectedHistoryAppointment.consultation && (
                  <div className="mb-4">
                    <h6 className="fw-bold text-primary mb-3">
                      <i className="bi bi-clipboard2-pulse me-2"></i>Consultation Details
                    </h6>
                    <div className="bg-light p-3 rounded-3">
                      {selectedHistoryAppointment.consultation.diagnosis && (
                        <div className="mb-3">
                          <p className="mb-1 text-muted small">Diagnosis</p>
                          <p className="mb-0">{selectedHistoryAppointment.consultation.diagnosis}</p>
                        </div>
                      )}
                      {selectedHistoryAppointment.consultation.doctorNotes && (
                        <div className="mb-3">
                          <p className="mb-1 text-muted small">Doctor's Notes</p>
                          <p className="mb-0">{selectedHistoryAppointment.consultation.doctorNotes}</p>
                        </div>
                      )}
                      {selectedHistoryAppointment.consultation.followUpDate && (
                        <div>
                          <p className="mb-1 text-muted small">Follow-up Date</p>
                          <p className="mb-0">{formatDate(selectedHistoryAppointment.consultation.followUpDate)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Prescription */}
                {selectedHistoryAppointment.prescription && selectedHistoryAppointment.prescription.medications && (
                  <div className="mb-4">
                    <h6 className="fw-bold text-primary mb-3">
                      <i className="bi bi-capsule me-2"></i>Prescription
                    </h6>
                    <div className="bg-success-subtle p-3 rounded-3">
                      <p className="mb-2 text-success fw-semibold">
                        {selectedHistoryAppointment.prescription.medicationCount} Medication(s)
                      </p>
                      <ul className="list-unstyled mb-0">
                        {selectedHistoryAppointment.prescription.medications.map((med, i) => (
                          <li key={i} className="mb-3 pb-3 border-bottom">
                            <div className="fw-semibold text-dark mb-1">{med.medicationName}</div>
                            <div className="small text-muted">
                              <span className="badge bg-success me-2">{med.dosage}</span>
                              <span>{med.instructions}</span>
                            </div>
                            <div className="small text-muted mt-1">
                              <i className="bi bi-calendar-check me-1"></i>
                              {med.totalSupplyDays} days supply
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Invoice */}
                {selectedHistoryAppointment.invoice && (
                  <div>
                    <h6 className="fw-bold text-primary mb-3">
                      <i className="bi bi-receipt me-2"></i>Invoice
                    </h6>
                    <div className="bg-light p-3 rounded-3">
                      <div className="row">
                        <div className="col-md-4">
                          <p className="mb-1 text-muted small">Amount</p>
                          <p className="fw-semibold text-success">${selectedHistoryAppointment.invoice.totalAmount}</p>
                        </div>
                        <div className="col-md-4">
                          <p className="mb-1 text-muted small">Status</p>
                          <span className={`badge ${selectedHistoryAppointment.invoice.paymentStatus === 'Paid' ? 'bg-success' : 'bg-warning'}`}>
                            {selectedHistoryAppointment.invoice.paymentStatus}
                          </span>
                        </div>
                        <div className="col-md-4">
                          <p className="mb-1 text-muted small">Payment Date</p>
                          <p className="mb-0">{formatDate(selectedHistoryAppointment.invoice.paymentDate)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDetailModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Complete Confirmation Modal */}
      {showCompleteConfirmModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title">
                  <i className="bi bi-check-circle-fill text-success me-2"></i>
                  Confirm Complete Appointment
                </h5>
                
              </div>
              <div className="modal-body">
                <p className="mb-0">Are you sure you want to mark this appointment as completed?</p>
              </div>
              <div className="modal-footer border-0 pt-0">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCompleteConfirmModal(false)}
                  disabled={completingAppointment}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={handleCompleteAppointment}
                  disabled={completingAppointment}
                >
                  <i className="bi bi-check-circle me-2"></i>
                  {completingAppointment ? 'Completing...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorAppointmentDetail;
