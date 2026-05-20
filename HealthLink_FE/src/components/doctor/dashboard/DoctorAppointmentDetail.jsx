import React, { useCallback, useEffect, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/DoctorPage.css';
import { toast } from 'react-toastify';
import { collection, getDocs, query, where } from 'firebase/firestore';
import DoctorPrescriptionWorkspace from './DoctorPrescriptionWorkspace';
import SharedRecordsView from './SharedRecordsView';
import { appointmentService } from '../api/appointmentApi';
import { prescriptionService } from '../../../api/prescriptionApi';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { db } from '../firebase';

const TABS = [
  { id: 'notes', label: 'Consultation Notes', icon: 'bi-journal-text' },
  { id: 'history', label: 'Medical History', icon: 'bi-clock-history' },
  { id: 'shared', label: 'Shared Records', icon: 'bi-folder2-open' },
  { id: 'prescription', label: 'Prescription', icon: 'bi-capsule-pill' },
  { id: 'followup', label: 'Follow-up', icon: 'bi-calendar-check' },
];

const DoctorAppointmentDetail = ({ appointment, patient, onBack }) => {
  const [medicalHistory, setMedicalHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [appointmentDetail, setAppointmentDetail] = useState(null);
  const [loadingAppointment, setLoadingAppointment] = useState(false);
  const [prescription, setPrescription] = useState(null);
  const [loadingPrescription, setLoadingPrescription] = useState(false);
  const [selectedHistoryAppointment, setSelectedHistoryAppointment] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [completingAppointment, setCompletingAppointment] = useState(false);
  const [showCompleteConfirmModal, setShowCompleteConfirmModal] = useState(false);
  const [activeTab, setActiveTab] = useState('notes');
  const { roles, initiateCall } = useAuth();
  const { openChatWith } = useChat();

  const patientId =
    patient?.patientID ||
    patient?.patientId ||
    appointment?.patientID ||
    appointment?.patientId ||
    appointment?.patient?.patientID ||
    appointment?.patient?.patientId ||
    null;
  const doctorId =
    appointment?.doctorID ||
    appointment?.doctorId ||
    appointment?.doctor?.doctorID ||
    appointment?.doctor?.doctorId ||
    null;
  const appointmentId = appointment?.appointmentID || appointment?.appointmentId || null;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return 'N/A';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age -= 1;
    }

    return age;
  };

  const getPatientInitials = (name) => {
    if (!name) return 'PT';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  };

  const getStatusClassName = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'completed':
        return 'doctor-detail-status doctor-detail-status--completed';
      case 'scheduled':
        return 'doctor-detail-status doctor-detail-status--scheduled';
      case 'cancelled':
        return 'doctor-detail-status doctor-detail-status--cancelled';
      default:
        return 'doctor-detail-status';
    }
  };

  const getTypeClassName = (type) => {
    switch ((type || '').toLowerCase()) {
      case 'video call':
        return 'doctor-detail-chip doctor-detail-chip--video';
      case 'audio call':
        return 'doctor-detail-chip doctor-detail-chip--audio';
      case 'chat':
        return 'doctor-detail-chip doctor-detail-chip--chat';
      default:
        return 'doctor-detail-chip';
    }
  };

  const getTypeIcon = (type) => {
    switch ((type || '').toLowerCase()) {
      case 'video call':
        return 'bi-camera-video';
      case 'audio call':
        return 'bi-telephone';
      case 'chat':
        return 'bi-chat-dots';
      default:
        return 'bi-calendar-event';
    }
  };

  const buildConsultation = (source) => {
    const consultation = source?.consultation || {};

    return {
      diagnosis: consultation.diagnosis ?? source?.diagnosis ?? null,
      doctorNotes: consultation.doctorNotes ?? source?.doctorNotes ?? null,
      treatmentPlan: consultation.treatmentPlan ?? source?.treatmentPlan ?? null,
      followUpDate: consultation.followUpDate ?? source?.followUpDate ?? null,
      followUpNotes: consultation.followUpNotes ?? source?.followUpNotes ?? null,
    };
  };

  const fetchAppointmentBundle = useCallback(async (targetAppointmentId, options = {}) => {
    const detail = await appointmentService.getAppointmentDetail(targetAppointmentId);
    const resolvedDoctorId = detail?.doctorId || detail?.doctorID || doctorId;
    const relatedPrescription = await prescriptionService
      .getByAppointment(targetAppointmentId, {
        doctorId: resolvedDoctorId,
        patientId,
      })
      .catch((error) => {
        if (options.showErrors) {
          console.error('Error loading prescription:', error);
        }
        return null;
      });

    return {
      ...detail,
      appointmentId: detail?.appointmentId ?? detail?.appointmentID ?? targetAppointmentId,
      appointmentID: detail?.appointmentID ?? detail?.appointmentId ?? targetAppointmentId,
      consultation: buildConsultation(detail),
      prescription: relatedPrescription,
    };
  }, [doctorId, patientId]);

  const refreshAppointmentData = useCallback(async (options = {}) => {
    if (!appointmentId) return;

    setLoadingAppointment(true);
    setLoadingPrescription(true);

    try {
      const bundle = await fetchAppointmentBundle(appointmentId, options);
      setAppointmentDetail(bundle);
      setPrescription(bundle.prescription);
    } catch (error) {
      console.error('Error refreshing appointment detail:', error);
      if (options.showToast !== false) {
        toast.error('Failed to refresh appointment details');
      }
    } finally {
      setLoadingAppointment(false);
      setLoadingPrescription(false);
    }
  }, [appointmentId, fetchAppointmentBundle]);

  useEffect(() => {
    const loadAppointmentData = async () => {
      await refreshAppointmentData();
    };

    loadAppointmentData();
  }, [refreshAppointmentData]);

  useEffect(() => {
    const fetchMedicalHistory = async () => {
      if (!patientId) return;

      setLoadingHistory(true);
      try {
        const data = await appointmentService.getPatientMedicalHistory(patientId);
        setMedicalHistory(data);
      } catch (error) {
        console.error('Error fetching patient medical history:', error);
        toast.error('Failed to load patient medical history');
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchMedicalHistory();
  }, [patientId]);

  const handleViewAppointmentDetail = async (targetAppointmentId) => {
    try {
      const bundle = await fetchAppointmentBundle(targetAppointmentId, { showErrors: true });
      setSelectedHistoryAppointment(bundle);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error loading appointment detail:', error);
      toast.error('Failed to load appointment details');
    }
  };

  const handleCompleteAppointment = async () => {
    if (!appointmentId) return;

    setCompletingAppointment(true);
    setShowCompleteConfirmModal(false);

    try {
      await appointmentService.completeAppointment(appointmentId);
      toast.success('Appointment marked as completed successfully');
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

  const handleChat = async () => {
    const partnerData = appointment?.patient;
    const partnerId = appointment?.patient?.patientId || appointment?.patientId || patientId;

    if (!partnerData || !partnerId) {
      alert('Chat partner information is missing.');
      return;
    }

    const firebaseID = partnerId.includes('-')
      ? partnerId.substring(0, partnerId.length - 4)
      : partnerId.substring(0, partnerId.length - 5);

    try {
      const usersRef = collection(db, 'users');
      let currentQuery = query(usersRef, where('__name__', '==', firebaseID));
      let querySnapshot = await getDocs(currentQuery);

      if (!querySnapshot.empty) {
        const partnerUser = { ...querySnapshot.docs[0].data(), uid: querySnapshot.docs[0].id };
        openChatWith(partnerUser);
        return;
      }

      currentQuery = query(usersRef, where('uid', '==', firebaseID));
      querySnapshot = await getDocs(currentQuery);

      if (!querySnapshot.empty) {
        const partnerUser = { ...querySnapshot.docs[0].data(), uid: querySnapshot.docs[0].id };
        openChatWith(partnerUser);
        return;
      }

      alert('Could not find chat user.');
    } catch (error) {
      console.error('[Chat] Error:', error);
      alert('Error initiating chat.');
    }
  };

  const handleVideoCall = async () => {
    try {
      const resolvedPatientId = appointment?.patient?.patientId || appointment?.patientId || patientId;
      const resolvedDoctorId = doctorId;
      const patientName = appointment?.patient?.fullName || patient?.fullName || 'Patient';
      const doctorName = appointment?.doctor?.fullName || appointmentDetail?.doctorName || 'Doctor';
      const isDoctor = roles && roles.some((role) => String(role).trim().toLowerCase() === 'doctor');
      const targetUserId = isDoctor ? resolvedPatientId : resolvedDoctorId;
      const targetUserName = isDoctor ? patientName : doctorName;

      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let roomId = '';
      for (let index = 0; index < 45; index += 1) {
        roomId += characters.charAt(Math.floor(Math.random() * characters.length));
      }

      initiateCall(targetUserId, roomId, targetUserName, doctorName);
    } catch (error) {
      console.error('Error initiating video call:', error);
      alert('Unable to start video call.');
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

  const currentAppointment = {
    ...appointment,
    ...appointmentDetail,
    appointmentID: appointmentDetail?.appointmentID ?? appointment?.appointmentID ?? appointment?.appointmentId,
    appointmentId: appointmentDetail?.appointmentId ?? appointment?.appointmentId ?? appointment?.appointmentID,
  };
  const consultation = buildConsultation(currentAppointment);
  const patientName = patient?.fullName || currentAppointment?.patientName || 'Unknown patient';
  const patientEmail = patient?.email || patient?.user?.email || appointmentDetail?.patientEmail || 'N/A';
  const reasonForVisit =
    currentAppointment?.reason ||
    currentAppointment?.symptoms ||
    currentAppointment?.notes ||
    'No reason provided';
  const completedHistory =
    medicalHistory?.appointments?.filter((historyItem) => historyItem.status === 'Completed') || [];
  const sharedRecordCount =
    medicalHistory?.documentsByCategory?.reduce(
      (total, category) => total + (category.documentCount || 0),
      0,
    ) || 0;
  const appointmentPassed = new Date(currentAppointment?.appointmentTime) < new Date();
  const joinDisabled = currentAppointment?.status !== 'Scheduled' || appointmentPassed;
  const actionLabel =
    currentAppointment?.consultationType === 'Chat'
      ? 'Open Chat'
      : `Join ${currentAppointment?.consultationType || 'Consultation'}`;
  const alertItems = [
    { label: 'Allergies', value: patient?.allergies },
    { label: 'Chronic conditions', value: patient?.chronicConditions },
    { label: 'Current medications', value: patient?.currentMedications },
  ].filter((item) => item.value);

  const renderEmptyState = (title, description) => (
    <div className="doctor-detail-empty">
      <div className="doctor-detail-empty__icon">
        <i className="bi bi-inbox"></i>
      </div>
      <h3 className="doctor-detail-empty__title">{title}</h3>
      <p className="doctor-detail-empty__description">{description}</p>
    </div>
  );

  return (
    <div className="doctor-detail-layout">
      <div className="doctor-detail-back">
        <button className="btn btn-link p-0 text-decoration-none" onClick={() => onBack?.()}>
          <i className="bi bi-arrow-left me-2"></i>
          Back to appointments
        </button>
      </div>

      <div className="row g-4 align-items-start">
        <div className="col-12 col-xl-4">
          <div className="doctor-detail-stack">
            <section className="doctor-detail-card doctor-detail-card--hero">
              <div className="doctor-detail-card__hero-top">
                <span className={getTypeClassName(currentAppointment?.consultationType)}>
                  <i className={`bi ${getTypeIcon(currentAppointment?.consultationType)}`}></i>
                  {currentAppointment?.consultationType || 'Consultation'}
                </span>
                <span className={getStatusClassName(currentAppointment?.status)}>
                  {currentAppointment?.status || 'Unknown'}
                </span>
              </div>

              <div className="doctor-detail-patient">
                {patient?.avatarUrl ? (
                  <img
                    className="doctor-detail-avatar"
                    src={patient.avatarUrl}
                    alt={patientName}
                  />
                ) : (
                  <div className="doctor-detail-avatar doctor-detail-avatar--fallback">
                    {getPatientInitials(patientName)}
                  </div>
                )}

                <div>
                  <h2 className="doctor-detail-patient__name">{patientName}</h2>
                  <p className="doctor-detail-patient__meta">
                    {calculateAge(patient?.dateOfBirth)} yrs
                    <span className="doctor-detail-dot"></span>
                    {patient?.gender || 'Gender N/A'}
                  </p>
                  <p className="doctor-detail-patient__email">{patientEmail}</p>
                </div>
              </div>

              <div className="doctor-detail-overview-grid">
                <div className="doctor-detail-overview-item">
                  <span className="doctor-detail-overview-item__label">Appointment</span>
                  <span className="doctor-detail-overview-item__value">
                    {formatDate(currentAppointment?.appointmentTime)}
                  </span>
                </div>
                <div className="doctor-detail-overview-item">
                  <span className="doctor-detail-overview-item__label">Time</span>
                  <span className="doctor-detail-overview-item__value">
                    {formatTime(currentAppointment?.appointmentTime)}
                  </span>
                </div>
                <div className="doctor-detail-overview-item">
                  <span className="doctor-detail-overview-item__label">Blood type</span>
                  <span className="doctor-detail-overview-item__value">{patient?.bloodType || 'N/A'}</span>
                </div>
                <div className="doctor-detail-overview-item">
                  <span className="doctor-detail-overview-item__label">Phone</span>
                  <span className="doctor-detail-overview-item__value">
                    {patient?.phoneNumber || appointmentDetail?.patientPhone || 'N/A'}
                  </span>
                </div>
              </div>
            </section>

            <section className="doctor-detail-card">
              <div className="doctor-detail-card__section-heading">
                <div>
                  <p className="doctor-detail-eyebrow">Medical Alerts</p>
                  <h3 className="doctor-detail-section-title">Known risk factors</h3>
                </div>
              </div>

              {alertItems.length > 0 ? (
                <div className="doctor-detail-alert-list">
                  {alertItems.map((item) => (
                    <div className="doctor-detail-alert-item" key={item.label}>
                      <div className="doctor-detail-alert-item__label">
                        <i className="bi bi-exclamation-triangle me-2"></i>
                        {item.label}
                      </div>
                      <div className="doctor-detail-alert-item__value">{item.value}</div>
                    </div>
                  ))}
                </div>
              ) : (
                renderEmptyState(
                  'No alerts on file',
                  'This patient does not have allergies, chronic conditions, or current medications recorded yet.',
                )
              )}
            </section>

            <section className="doctor-detail-card">
              <div className="doctor-detail-card__section-heading">
                <div>
                  <p className="doctor-detail-eyebrow">Reason For Visit</p>
                  <h3 className="doctor-detail-section-title">Current concern</h3>
                </div>
              </div>
              <div className="doctor-detail-reason">{reasonForVisit}</div>
            </section>
          </div>
        </div>

        <div className="col-12 col-xl-8">
          <section className="doctor-detail-card doctor-detail-workspace">
            <div className="doctor-detail-workspace__header">
              <div className="doctor-detail-workspace__meta">
                <span>
                  <i className="bi bi-calendar3 me-2"></i>
                  {formatDateTime(currentAppointment?.appointmentTime)}
                </span>
              </div>
            </div>

            <div className="doctor-detail-tabs" role="tablist" aria-label="Appointment detail tabs">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  className={`doctor-detail-tab ${activeTab === tab.id ? 'doctor-detail-tab--active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                  type="button"
                >
                  <i className={`bi ${tab.icon}`}></i>
                  {tab.label}
                  {tab.id === 'shared' && sharedRecordCount > 0 ? (
                    <span className="doctor-detail-tab__count">{sharedRecordCount}</span>
                  ) : null}
                </button>
              ))}
            </div>

            <div className="doctor-detail-tab-panel">
              {activeTab === 'notes' && (
                <>
                  {loadingAppointment ? (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  ) : consultation.diagnosis || consultation.doctorNotes || consultation.treatmentPlan ? (
                    <div className="doctor-detail-note-grid">
                      {consultation.diagnosis ? (
                        <div className="doctor-detail-note-card">
                          <p className="doctor-detail-note-card__label">Diagnosis</p>
                          <p className="doctor-detail-note-card__value">{consultation.diagnosis}</p>
                        </div>
                      ) : null}
                      {consultation.doctorNotes ? (
                        <div className="doctor-detail-note-card">
                          <p className="doctor-detail-note-card__label">Doctor Notes</p>
                          <p className="doctor-detail-note-card__value">{consultation.doctorNotes}</p>
                        </div>
                      ) : null}
                      {consultation.treatmentPlan ? (
                        <div className="doctor-detail-note-card">
                          <p className="doctor-detail-note-card__label">Treatment Plan</p>
                          <p className="doctor-detail-note-card__value">{consultation.treatmentPlan}</p>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    renderEmptyState(
                      'No consultation notes yet',
                      'Diagnosis, doctor notes, and treatment plan will appear here when consultation data is available.',
                    )
                  )}
                </>
              )}

              {activeTab === 'history' && (
                <>
                  {loadingHistory ? (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  ) : (
                    <div className="doctor-detail-history">
                      {medicalHistory?.medicalHistorySummary ? (
                        <div className="doctor-detail-note-card">
                          <p className="doctor-detail-note-card__label">Medical History Summary</p>
                          <p className="doctor-detail-note-card__value">{medicalHistory.medicalHistorySummary}</p>
                        </div>
                      ) : null}

                      {completedHistory.length > 0 ? (
                        <div className="doctor-detail-history-list">
                          {completedHistory.map((historyItem) => (
                            <article className="doctor-detail-history-card" key={historyItem.appointmentID}>
                              <div className="doctor-detail-history-card__header">
                                <div>
                                  <h4>{formatDate(historyItem.appointmentTime)}</h4>
                                  <p>
                                    <span className={getStatusClassName(historyItem.status)}>
                                      {historyItem.status}
                                    </span>
                                    <span className={getTypeClassName(historyItem.consultationType)}>
                                      {historyItem.consultationType}
                                    </span>
                                  </p>
                                </div>
                                <button
                                  className="btn btn-outline-primary btn-sm"
                                  onClick={() => handleViewAppointmentDetail(historyItem.appointmentID)}
                                  type="button"
                                >
                                  View detail
                                </button>
                              </div>

                              <div className="doctor-detail-history-card__body">
                                <p>
                                  <strong>Doctor:</strong> {historyItem.doctorName || 'N/A'}
                                  {historyItem.doctorSpecialty ? ` • ${historyItem.doctorSpecialty}` : ''}
                                </p>
                                {historyItem.symptoms ? (
                                  <p>
                                    <strong>Visit reason:</strong> {historyItem.symptoms}
                                  </p>
                                ) : null}
                                {historyItem.diagnosis ? (
                                  <p>
                                    <strong>Diagnosis:</strong> {historyItem.diagnosis}
                                  </p>
                                ) : null}
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        renderEmptyState(
                          'No completed appointments found',
                          'Completed visits for this patient will appear here once they become available.',
                        )
                      )}
                    </div>
                  )}
                </>
              )}

              {activeTab === 'shared' && (
                <div className="doctor-detail-shared">
                  <p className="doctor-detail-shared__intro">
                    Shared records available for {patientName}
                  </p>
                  <SharedRecordsView patientFilter={patientId} />
                </div>
              )}

              {activeTab === 'prescription' && (
                <DoctorPrescriptionWorkspace
                  appointment={currentAppointment}
                  patient={patient}
                  consultation={consultation}
                  prescription={prescription}
                  loadingPrescription={loadingPrescription}
                  onPrescriptionCreated={() => refreshAppointmentData({ showToast: false })}
                />
              )}

              {activeTab === 'followup' && (
                <>
                  {consultation.followUpDate || consultation.followUpNotes ? (
                    <div className="doctor-detail-followup">
                      <div className="doctor-detail-note-card">
                        <p className="doctor-detail-note-card__label">Follow-up Date</p>
                        <p className="doctor-detail-note-card__value">
                          {consultation.followUpDate ? formatDateTime(consultation.followUpDate) : 'Not scheduled'}
                        </p>
                      </div>
                      <div className="doctor-detail-note-card">
                        <p className="doctor-detail-note-card__label">Follow-up Notes</p>
                        <p className="doctor-detail-note-card__value">
                          {consultation.followUpNotes || 'No follow-up notes recorded.'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    renderEmptyState(
                      'No follow-up scheduled',
                      'Follow-up date and notes will appear here after they are added to the consultation.',
                    )
                  )}
                </>
              )}
            </div>

            <div className="doctor-detail-actionbar doctor-detail-actionbar--workspace">
              <div className="doctor-detail-actionbar__group">
                <button className="btn btn-outline-primary" onClick={handleChat} type="button">
                  <i className="bi bi-chat-dots me-2"></i>
                  Send Message
                </button>
              </div>
              <div className="doctor-detail-actionbar__group doctor-detail-actionbar__group--primary">
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    if (currentAppointment?.consultationType === 'Chat') {
                      handleChat();
                      return;
                    }
                    handleVideoCall();
                  }}
                  type="button"
                  title={
                    appointmentPassed
                      ? 'Appointment time has passed'
                      : actionLabel
                  }
                  disabled={joinDisabled}
                >
                  <i className={`bi ${getTypeIcon(currentAppointment?.consultationType)} me-2`}></i>
                  {actionLabel}
                </button>
                <button
                  className="btn btn-success"
                  onClick={() => setShowCompleteConfirmModal(true)}
                  type="button"
                  disabled={currentAppointment?.status !== 'Scheduled' || completingAppointment}
                >
                  <i className="bi bi-check-circle me-2"></i>
                  {completingAppointment ? 'Completing...' : 'Complete Consultation'}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {showDetailModal && selectedHistoryAppointment ? (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)' }}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Appointment Snapshot</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowDetailModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="doctor-detail-modal-grid">
                  <div className="doctor-detail-note-card">
                    <p className="doctor-detail-note-card__label">Date & Time</p>
                    <p className="doctor-detail-note-card__value">
                      {formatDateTime(selectedHistoryAppointment.appointmentTime)}
                    </p>
                  </div>
                  <div className="doctor-detail-note-card">
                    <p className="doctor-detail-note-card__label">Consultation Type</p>
                    <p className="doctor-detail-note-card__value">
                      {selectedHistoryAppointment.consultationType || 'N/A'}
                    </p>
                  </div>
                  <div className="doctor-detail-note-card">
                    <p className="doctor-detail-note-card__label">Doctor</p>
                    <p className="doctor-detail-note-card__value">
                      {selectedHistoryAppointment.doctorName || 'N/A'}
                    </p>
                  </div>
                  <div className="doctor-detail-note-card">
                    <p className="doctor-detail-note-card__label">Status</p>
                    <p className="doctor-detail-note-card__value">
                      {selectedHistoryAppointment.status || 'N/A'}
                    </p>
                  </div>
                </div>

                {buildConsultation(selectedHistoryAppointment).diagnosis ? (
                  <div className="doctor-detail-note-card mt-3">
                    <p className="doctor-detail-note-card__label">Diagnosis</p>
                    <p className="doctor-detail-note-card__value">
                      {buildConsultation(selectedHistoryAppointment).diagnosis}
                    </p>
                  </div>
                ) : null}

                {buildConsultation(selectedHistoryAppointment).doctorNotes ? (
                  <div className="doctor-detail-note-card mt-3">
                    <p className="doctor-detail-note-card__label">Doctor Notes</p>
                    <p className="doctor-detail-note-card__value">
                      {buildConsultation(selectedHistoryAppointment).doctorNotes}
                    </p>
                  </div>
                ) : null}

                {selectedHistoryAppointment?.prescription?.medications?.length ? (
                  <div className="doctor-detail-note-card mt-3">
                    <p className="doctor-detail-note-card__label">Prescription</p>
                    <div className="doctor-detail-prescription__list mt-2">
                      {selectedHistoryAppointment.prescription.medications.map((medication, index) => (
                        <div className="doctor-detail-prescription__item" key={`${medication.medicationName}-${index}`}>
                          <div className="doctor-detail-prescription__item-top">
                            <h4>{medication.medicationName}</h4>
                            <span>{medication.dosage}</span>
                          </div>
                          <p>{medication.instructions}</p>
                          <small>{medication.totalSupplyDays} days supply</small>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showCompleteConfirmModal ? (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-check-circle-fill text-success me-2"></i>
                  Confirm completion
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
                  {completingAppointment ? 'Completing...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default DoctorAppointmentDetail;
