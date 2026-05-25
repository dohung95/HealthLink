import React, { useCallback, useEffect, useMemo, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-calendar/dist/Calendar.css';
import '../styles/DoctorPage.css';
import { toast } from 'react-toastify';
import { collection, getDocs, query, where } from 'firebase/firestore';
import Calendar from 'react-calendar';
import DoctorPrescriptionWorkspace from './DoctorPrescriptionWorkspace';
import SharedRecordsView from './SharedRecordsView';
import { appointmentService } from '../api/appointmentApi';
import { consultationApi } from '../../../api/consultationApi';
import { prescriptionService } from '../../../api/prescriptionApi';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { db } from '../firebase';

const TABS = [
  { id: 'notes', label: 'Consultation Notes', shortLabel: 'Notes', icon: 'bi-journal-text' },
  { id: 'history', label: 'Medical History', shortLabel: 'History', icon: 'bi-clock-history' },
  { id: 'shared', label: 'Shared Records', shortLabel: 'Shared', icon: 'bi-folder2-open' },
  { id: 'prescription', label: 'Prescription', shortLabel: 'Prescription', icon: 'bi-capsule-pill' },
  { id: 'followup', label: 'Follow-up', shortLabel: 'Follow-up', icon: 'bi-calendar-check' },
];

const toLocalDateValue = (date) => {
  if (!date) return '';
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return '';

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toMonthValue = (date) => {
  if (!date) return '';
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return '';
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
};

const buildFollowUpDateTime = (date, startTime) => {
  const dateValue = toLocalDateValue(date);
  if (!dateValue || !startTime) return null;
  return `${dateValue}T${startTime}:00`;
};

const DoctorAppointmentDetail = ({ appointment, patient, doctorId: currentDoctorId, onBack, onOpenAppointmentById }) => {
  const [medicalHistory, setMedicalHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [appointmentDetail, setAppointmentDetail] = useState(null);
  const [loadingAppointment, setLoadingAppointment] = useState(false);
  const [prescription, setPrescription] = useState(null);
  const [prescriptionDraft, setPrescriptionDraft] = useState(null);
  const [loadingPrescription, setLoadingPrescription] = useState(false);
  const [selectedHistoryAppointment, setSelectedHistoryAppointment] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [completingAppointment, setCompletingAppointment] = useState(false);
  const [showCompleteConfirmModal, setShowCompleteConfirmModal] = useState(false);
  const [activeTab, setActiveTab] = useState('notes');
  const [followUpSelectedDate, setFollowUpSelectedDate] = useState(new Date());
  const [followUpCalendarMonth, setFollowUpCalendarMonth] = useState(toMonthValue(new Date()));
  const [followUpSlots, setFollowUpSlots] = useState([]);
  const [followUpCalendarDays, setFollowUpCalendarDays] = useState([]);
  const [selectedFollowUpDateTime, setSelectedFollowUpDateTime] = useState(null);
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [loadingFollowUpSlots, setLoadingFollowUpSlots] = useState(false);
  const [loadingFollowUpCalendar, setLoadingFollowUpCalendar] = useState(false);
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  const [followUpAction, setFollowUpAction] = useState(null);
  const [startingConsultation, setStartingConsultation] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState({
    diagnosis: '',
    doctorNotes: '',
    treatmentPlan: '',
  });
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
    currentDoctorId ||
    appointment?.doctorID ||
    appointment?.doctorId ||
    appointment?.doctor?.doctorID ||
    appointment?.doctor?.doctorId ||
    null;
  const appointmentId = appointment?.appointmentID || appointment?.appointmentId || null;
  const effectiveDoctorId =
    appointmentDetail?.doctorId ||
    appointmentDetail?.doctorID ||
    appointmentDetail?.doctor?.doctorId ||
    appointmentDetail?.doctor?.doctorID ||
    doctorId;
  const followUpSelectedDateValue = toLocalDateValue(followUpSelectedDate);

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
      consultationId: consultation.consultationId ?? source?.consultationId ?? null,
      startTime: consultation.startTime ?? source?.consultationStartTime ?? source?.startTime ?? null,
      endTime: consultation.endTime ?? source?.consultationEndTime ?? source?.endTime ?? null,
      diagnosis: consultation.diagnosis ?? source?.diagnosis ?? null,
      doctorNotes: consultation.doctorNotes ?? source?.doctorNotes ?? null,
      treatmentPlan: consultation.treatmentPlan ?? source?.treatmentPlan ?? null,
      followUpDate: consultation.followUpDate ?? source?.followUpDate ?? null,
      followUpAppointmentId: consultation.followUpAppointmentId ?? source?.followUpAppointmentId ?? null,
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
      setPrescriptionDraft(null);
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

  useEffect(() => {
    const source = appointmentDetail || appointment;
    const followUp = buildConsultation(source);

    setFollowUpNotes(followUp.followUpNotes || '');

    if (followUp.followUpDate) {
      const nextFollowUpDate = new Date(followUp.followUpDate);
      if (!Number.isNaN(nextFollowUpDate.getTime())) {
        const hours = String(nextFollowUpDate.getHours()).padStart(2, '0');
        const minutes = String(nextFollowUpDate.getMinutes()).padStart(2, '0');

        setFollowUpSelectedDate(nextFollowUpDate);
        setFollowUpCalendarMonth(toMonthValue(nextFollowUpDate));
        setSelectedFollowUpDateTime(
          buildFollowUpDateTime(nextFollowUpDate, `${hours}:${minutes}`),
        );
        return;
      }
    }

    const today = new Date();
    setFollowUpSelectedDate(today);
    setFollowUpCalendarMonth(toMonthValue(today));
    setSelectedFollowUpDateTime(null);
  }, [
    appointment,
    appointmentDetail,
    appointmentDetail?.appointmentId,
    appointmentDetail?.appointmentID,
    appointmentDetail?.consultation?.followUpDate,
    appointmentDetail?.consultation?.followUpNotes,
    appointmentDetail?.followUpDate,
    appointmentDetail?.followUpNotes,
  ]);

  useEffect(() => {
    const consultation = buildConsultation(appointmentDetail || appointment);
    setNotesDraft({
      diagnosis: consultation.diagnosis || '',
      doctorNotes: consultation.doctorNotes || '',
      treatmentPlan: consultation.treatmentPlan || '',
    });
  }, [
    appointment,
    appointmentDetail,
    appointmentDetail?.consultation?.diagnosis,
    appointmentDetail?.consultation?.doctorNotes,
    appointmentDetail?.consultation?.treatmentPlan,
    appointmentDetail?.diagnosis,
    appointmentDetail?.doctorNotes,
    appointmentDetail?.treatmentPlan,
  ]);

  const followUpCalendarDayMap = useMemo(() => {
    const entries = Array.isArray(followUpCalendarDays)
      ? followUpCalendarDays.map((day) => [day.date, day])
      : [];

    return new Map(entries);
  }, [followUpCalendarDays]);

  const loadFollowUpSlots = useCallback(async () => {
    if (activeTab !== 'followup' || !effectiveDoctorId || !followUpSelectedDateValue) {
      return;
    }

    setLoadingFollowUpSlots(true);
    try {
      const data = await appointmentService.getFollowUpSlots(
        effectiveDoctorId,
        followUpSelectedDateValue,
      );
      setFollowUpSlots(Array.isArray(data?.slots) ? data.slots : []);
    } catch (error) {
      console.error('Error loading follow-up slots:', error);
      toast.error(error.response?.data?.message || 'Failed to load follow-up slots');
      setFollowUpSlots([]);
    } finally {
      setLoadingFollowUpSlots(false);
    }
  }, [activeTab, effectiveDoctorId, followUpSelectedDateValue]);

  useEffect(() => {
    loadFollowUpSlots();
  }, [loadFollowUpSlots]);

  const loadFollowUpCalendar = useCallback(async () => {
    if (activeTab !== 'followup' || !effectiveDoctorId || !followUpCalendarMonth) {
      return;
    }

    setLoadingFollowUpCalendar(true);
    try {
      const data = await appointmentService.getFollowUpCalendar(
        effectiveDoctorId,
        followUpCalendarMonth,
      );
      setFollowUpCalendarDays(Array.isArray(data?.days) ? data.days : []);
    } catch (error) {
      console.error('Error loading follow-up calendar:', error);
      setFollowUpCalendarDays([]);
    } finally {
      setLoadingFollowUpCalendar(false);
    }
  }, [activeTab, effectiveDoctorId, followUpCalendarMonth]);

  useEffect(() => {
    loadFollowUpCalendar();
  }, [loadFollowUpCalendar]);

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

  const handleFollowUpDateChange = (date) => {
    setFollowUpSelectedDate(date);
  };

  const handleFollowUpMonthChange = ({ activeStartDate }) => {
    const monthValue = toMonthValue(activeStartDate);
    if (monthValue) {
      setFollowUpCalendarMonth(monthValue);
    }
  };

  const savePendingFollowUp = async (followUpDate, notes, successMessage = null) => {
    const targetAppointmentId =
      appointmentDetail?.appointmentId ||
      appointmentDetail?.appointmentID ||
      appointmentId;
    const consultation = buildConsultation(appointmentDetail || appointment);

    if (!targetAppointmentId) {
      toast.error('Appointment data is not ready yet');
      return false;
    }
    if (!followUpDate) {
      toast.error('Please select an available follow-up slot');
      return false;
    }
    if (consultation.followUpAppointmentId) {
      toast.error('Follow-up appointment has already been created');
      return false;
    }

    setSavingFollowUp(true);
    setFollowUpAction('save');
    try {
      await consultationApi.updateAppointmentFollowUp(targetAppointmentId, {
        followUpDate,
        followUpNotes: notes?.trim() || null,
      });
      if (successMessage) {
        toast.success(successMessage);
      }
      await refreshAppointmentData({ showToast: false });
      await loadFollowUpSlots();
      await loadFollowUpCalendar();
      return true;
    } catch (error) {
      console.error('Error saving follow-up:', error);
      toast.error(error.response?.data?.message || 'Failed to save follow-up');
      return false;
    } finally {
      setSavingFollowUp(false);
      setFollowUpAction(null);
    }
  };

  const handleSelectFollowUpSlot = async (slot) => {
    if (!slot?.selectable || savingFollowUp) {
      return;
    }

    const nextFollowUpDateTime = buildFollowUpDateTime(followUpSelectedDate, slot.startTime);
    const previousFollowUpDateTime = selectedFollowUpDateTime;

    setSelectedFollowUpDateTime(nextFollowUpDateTime);

    const saved = await savePendingFollowUp(
      nextFollowUpDateTime,
      followUpNotes,
      'Follow-up slot selected',
    );
    if (!saved) {
      setSelectedFollowUpDateTime(previousFollowUpDateTime);
    }
  };

  const handleFollowUpNotesBlur = async (event) => {
    if (event?.relatedTarget?.dataset?.followupAction) {
      return;
    }

    const consultation = buildConsultation(appointmentDetail || appointment);
    const targetAppointmentId =
      appointmentDetail?.appointmentId ||
      appointmentDetail?.appointmentID ||
      appointmentId;

    if (
      savingFollowUp ||
      consultation.followUpAppointmentId ||
      !targetAppointmentId ||
      !selectedFollowUpDateTime
    ) {
      return;
    }

    const savedNotes = consultation.followUpNotes || '';
    const nextNotes = followUpNotes.trim();
    if (consultation.followUpDate === selectedFollowUpDateTime && savedNotes === nextNotes) {
      return;
    }

    await savePendingFollowUp(selectedFollowUpDateTime, followUpNotes);
  };

  const handleCancelFollowUp = async () => {
    const targetAppointmentId =
      appointmentDetail?.appointmentId ||
      appointmentDetail?.appointmentID ||
      appointmentId;
    const consultation = buildConsultation(appointmentDetail || appointment);

    if (!targetAppointmentId) {
      toast.error('Appointment data is not ready yet');
      return;
    }
    if (consultation.followUpAppointmentId) {
      toast.error('Follow-up appointment has already been created');
      return;
    }

    const previousFollowUpDateTime = selectedFollowUpDateTime;
    const previousFollowUpNotes = followUpNotes;

    setSelectedFollowUpDateTime(null);
    setFollowUpNotes('');
    setSavingFollowUp(true);
    setFollowUpAction('cancel');
    try {
      await consultationApi.cancelAppointmentFollowUp(targetAppointmentId);
      toast.success('Follow-up selection cancelled');
      await refreshAppointmentData({ showToast: false });
      await loadFollowUpSlots();
      await loadFollowUpCalendar();
    } catch (error) {
      console.error('Error cancelling follow-up:', error);
      setSelectedFollowUpDateTime(previousFollowUpDateTime);
      setFollowUpNotes(previousFollowUpNotes);
      toast.error(error.response?.data?.message || 'Failed to cancel follow-up');
    } finally {
      setSavingFollowUp(false);
      setFollowUpAction(null);
    }
  };

  const handleStartConsultation = async () => {
    if (!appointmentId || startingConsultation) return;

    setStartingConsultation(true);
    try {
      await consultationApi.startAppointmentConsultation(appointmentId);
      toast.success('Consultation started');
      await refreshAppointmentData({ showToast: false });
    } catch (error) {
      console.error('Error starting consultation:', error);
      toast.error(error.response?.data?.message || 'Failed to start consultation');
    } finally {
      setStartingConsultation(false);
    }
  };

  const handleNotesDraftChange = (field, value) => {
    setNotesDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
  };

  const handleSaveNotes = async () => {
    if (!appointmentId || savingNotes) return;

    setSavingNotes(true);
    try {
      await consultationApi.updateAppointmentNotes(appointmentId, {
        diagnosis: notesDraft.diagnosis,
        doctorNotes: notesDraft.doctorNotes,
        treatmentPlan: notesDraft.treatmentPlan,
      });
      toast.success('Consultation notes saved');
      await refreshAppointmentData({ showToast: false });
    } catch (error) {
      console.error('Error saving consultation notes:', error);
      toast.error(error.response?.data?.message || 'Failed to save consultation notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleCompleteAppointment = async () => {
    if (!appointmentId) return;
    const currentConsultation = buildConsultation(appointmentDetail || appointment);
    if (!currentConsultation.startTime) {
      toast.error('Start the consultation before completing it.');
      return;
    }

    const draftRows = Array.isArray(prescriptionDraft?.medicationRows)
      ? prescriptionDraft.medicationRows.filter((row) => row?.medicineId)
      : [];
    const getRowTimings = (row) => {
      const source = Array.isArray(row?.timings) && row.timings.length > 0
        ? row.timings
        : String(row?.timing || '')
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean);

      return [...new Set(source.map((value) => String(value).toUpperCase()).filter(Boolean))];
    };
    const incompleteRow = draftRows.find((row) => {
      const quantity = Number(row?.quantity);
      const totalSupplyDays = Number(row?.totalSupplyDays);
      const timings = getRowTimings(row);

      return (
        !Number.isFinite(quantity) ||
        quantity < 1 ||
        !Number.isFinite(totalSupplyDays) ||
        totalSupplyDays < 1 ||
        timings.length === 0
      );
    });

    if (!prescription && incompleteRow) {
      toast.error('Please complete quantity, supply days, and timing for all prescribed medications.');
      return;
    }

    const prescriptionPayload =
      !prescription && draftRows.length > 0
        ? {
            appointmentId,
            diagnosis:
              prescriptionDraft?.diagnosis?.trim() ||
              appointmentDetail?.consultation?.diagnosis ||
              appointmentDetail?.diagnosis ||
              null,
            notes:
              appointmentDetail?.consultation?.doctorNotes ||
              appointmentDetail?.doctorNotes ||
              null,
            items: draftRows.map((row) => {
              const timings = getRowTimings(row);
              return {
                medicineId: row.medicineId,
                totalSupplyDays: Number(row.totalSupplyDays),
                quantity: Number(row.quantity),
                unit: row.unit || null,
                frequency: row.frequency || null,
                timing: timings.join(','),
                timings,
                route: row.route || null,
                notes: row.notes?.trim() || null,
              };
            }),
          }
        : null;

    setCompletingAppointment(true);
    setShowCompleteConfirmModal(false);

    try {
      if (prescriptionPayload) {
        const createdPrescription = await prescriptionService.createPrescription(prescriptionPayload);
        setPrescription(createdPrescription);
      }

      const completionResult = await appointmentService.completeAppointment(appointmentId);
      const followUpAppointmentId =
        completionResult?.followUpAppointment?.appointmentId ||
        completionResult?.followUpAppointment?.appointmentID ||
        null;

      if (completionResult?.createdFollowUp && followUpAppointmentId) {
        toast.success('Appointment completed and follow-up scheduled');
        if (typeof onOpenAppointmentById === 'function') {
          await onOpenAppointmentById(followUpAppointmentId);
          return;
        }
      } else {
        toast.success('Appointment marked as completed successfully');
      }

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
  const completedHistory =
    medicalHistory?.appointments?.filter((historyItem) => historyItem.status === 'Completed') || [];
  const sharedRecordCount =
    medicalHistory?.documentsByCategory?.reduce(
      (total, category) => total + (category.documentCount || 0),
      0,
    ) || 0;
  const appointmentTime = currentAppointment?.appointmentTime
    ? new Date(currentAppointment.appointmentTime)
    : null;
  const hasAppointmentTimeArrived = appointmentTime
    ? appointmentTime <= new Date()
    : false;
  const hasStarted = Boolean(consultation.startTime || currentAppointment?.consultationStartTime);
  const isReadOnlyAppointment = currentAppointment?.status === 'Completed';
  const isCancelledAppointment = currentAppointment?.status === 'Cancelled';
  const canStartConsultation =
    currentAppointment?.status === 'Scheduled' &&
    hasAppointmentTimeArrived &&
    !hasStarted &&
    !startingConsultation;
  const canEditClinical = currentAppointment?.status === 'Scheduled' && hasStarted;
  const joinDisabled = !canEditClinical;
  const hasPendingFollowUp = Boolean(consultation.followUpDate || selectedFollowUpDateTime);
  const canCancelFollowUp = Boolean(
    currentAppointment?.appointmentId &&
    hasPendingFollowUp &&
    !consultation.followUpAppointmentId &&
    !isReadOnlyAppointment,
  );
  const actionLabel =
    currentAppointment?.consultationType === 'Chat'
      ? 'Open Chat'
      : `Join ${currentAppointment?.consultationType || 'Consultation'}`;
  const visitReason = [
    currentAppointment?.reason,
    currentAppointment?.symptoms,
    appointmentDetail?.reason,
    appointmentDetail?.symptoms,
  ].find((value) => typeof value === 'string' && value.trim()) || '';

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

      <div className="row g-4 align-items-stretch">
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
                </div>
              </div>

              <div className="doctor-detail-overview-grid">
                <div className="doctor-detail-overview-item">
                  <span className="doctor-detail-overview-item__label" aria-label="Appointment" title="Appointment">
                    <span className="material-symbols-outlined" aria-hidden="true">calendar_month</span>
                  </span>
                  <span className="doctor-detail-overview-item__value">
                    {formatDate(currentAppointment?.appointmentTime)}
                  </span>
                </div>
                <div className="doctor-detail-overview-item">
                  <span className="doctor-detail-overview-item__label" aria-label="Time" title="Time">
                    <span className="material-symbols-outlined" aria-hidden="true">schedule</span>
                  </span>
                  <span className="doctor-detail-overview-item__value">
                    {formatTime(currentAppointment?.appointmentTime)}
                  </span>
                </div>
                <div className="doctor-detail-overview-item">
                  <span className="doctor-detail-overview-item__label" aria-label="Email" title="Email">
                    <span className="material-symbols-outlined" aria-hidden="true">mail</span>
                  </span>
                  <span className="doctor-detail-overview-item__value">{patientEmail}</span>
                </div>
                <div className="doctor-detail-overview-item">
                  <span className="doctor-detail-overview-item__label" aria-label="Phone" title="Phone">
                    <span className="material-symbols-outlined" aria-hidden="true">call</span>
                  </span>
                  <span className="doctor-detail-overview-item__value">
                    {patient?.phoneNumber || appointmentDetail?.patientPhone || 'N/A'}
                  </span>
                </div>
              </div>
              <div className="doctor-detail-visit">
                <div className="doctor-detail-visit__divider"></div>
                <h3 className="doctor-detail-visit__label">Reason for visit</h3>
                <p
                  className={`doctor-detail-visit__content ${
                    visitReason ? '' : 'doctor-detail-visit__content--empty'
                  }`}
                >
                  {visitReason || 'The patient has not shared symptoms or a reason for this appointment yet.'}
                </p>
              </div>
            </section>
          </div>
        </div>

        <div className="col-12 col-xl-8">
          <section className="doctor-detail-card doctor-detail-workspace">
            <div className="doctor-detail-tabs" role="tablist" aria-label="Appointment detail tabs">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  className={`doctor-detail-tab ${activeTab === tab.id ? 'doctor-detail-tab--active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                  type="button"
                  title={tab.label}
                  aria-label={tab.label}
                >
                  <i className={`bi ${tab.icon}`}></i>
                  <span className="doctor-detail-tab__label">{tab.shortLabel || tab.label}</span>
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
                  ) : (
                    <div className="doctor-notes-workspace">
                      {!canEditClinical && !isReadOnlyAppointment ? (
                        <div className="doctor-detail-note-card doctor-notes-lock">
                          <p className="doctor-detail-note-card__label">Locked</p>
                          <p className="doctor-detail-note-card__value">
                            Start the consultation when the appointment time arrives to record diagnosis, notes, and treatment plan.
                          </p>
                        </div>
                      ) : null}

                      <label className="doctor-notes-field">
                        <span>Diagnosis</span>
                        <textarea
                          className="form-control doctor-prescription-input doctor-prescription-input--textarea"
                          disabled={!canEditClinical || savingNotes}
                          onChange={(event) => handleNotesDraftChange('diagnosis', event.target.value)}
                          placeholder="Enter the primary diagnosis..."
                          rows="3"
                          value={notesDraft.diagnosis}
                        />
                      </label>

                      <label className="doctor-notes-field">
                        <span>Doctor Notes</span>
                        <textarea
                          className="form-control doctor-prescription-input doctor-prescription-input--textarea"
                          disabled={!canEditClinical || savingNotes}
                          onChange={(event) => handleNotesDraftChange('doctorNotes', event.target.value)}
                          placeholder="Record observations, assessment, and consultation notes..."
                          rows="5"
                          value={notesDraft.doctorNotes}
                        />
                      </label>

                      <label className="doctor-notes-field">
                        <span>Treatment Plan</span>
                        <textarea
                          className="form-control doctor-prescription-input doctor-prescription-input--textarea"
                          disabled={!canEditClinical || savingNotes}
                          onChange={(event) => handleNotesDraftChange('treatmentPlan', event.target.value)}
                          placeholder="Outline treatment plan, lifestyle guidance, and next steps..."
                          rows="4"
                          value={notesDraft.treatmentPlan}
                        />
                      </label>

                      <div className="doctor-notes-actions">
                        <button
                          className="btn btn-primary"
                          disabled={!canEditClinical || savingNotes}
                          onClick={handleSaveNotes}
                          type="button"
                        >
                          <i className="bi bi-save me-2"></i>
                          {savingNotes ? 'Saving...' : 'Save Notes'}
                        </button>
                      </div>
                    </div>
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
                      {completedHistory.length > 0 ? (
                        <div className="doctor-detail-history-list">
                          {completedHistory.map((historyItem) => (
                            <article className="doctor-detail-history-card" key={historyItem.appointmentID || historyItem.appointmentId}>
                              <div className="doctor-detail-history-card__header">
                                <div className="doctor-detail-history-card__header-main">
                                  <div>
                                    <p className="doctor-detail-history-card__eyebrow">Completed visit</p>
                                    <h4>{formatDate(historyItem.appointmentTime)}</h4>
                                  </div>
                                  <p className="doctor-detail-history-card__time">
                                    <i className="bi bi-clock me-2"></i>
                                    {formatTime(historyItem.appointmentTime)}
                                  </p>
                                </div>
                                <div className="doctor-detail-history-card__header-row">
                                  <p className="doctor-detail-history-card__chips">
                                    <span className={getStatusClassName(historyItem.status)}>
                                      {historyItem.status}
                                    </span>
                                    <span className={getTypeClassName(historyItem.consultationType)}>
                                      {historyItem.consultationType}
                                    </span>
                                  </p>
                                  <button
                                    className="btn btn-outline-primary btn-sm doctor-detail-history-card__action"
                                    onClick={() => handleViewAppointmentDetail(historyItem.appointmentID)}
                                    type="button"
                                  >
                                    Open snapshot
                                  </button>
                                </div>
                              </div>

                              <div className="doctor-detail-history-card__body">
                                <div className="doctor-detail-history-card__fact">
                                  <span className="doctor-detail-history-card__fact-label">Provider</span>
                                  <p className="doctor-detail-history-card__fact-value">
                                    {historyItem.doctorName || 'N/A'}
                                    {historyItem.doctorSpecialty ? ` - ${historyItem.doctorSpecialty}` : ''}
                                  </p>
                                </div>
                                {historyItem.symptoms ? (
                                  <div className="doctor-detail-history-card__fact">
                                    <span className="doctor-detail-history-card__fact-label">Visit reason</span>
                                    <p className="doctor-detail-history-card__fact-value">{historyItem.symptoms}</p>
                                  </div>
                                ) : null}
                                {historyItem.diagnosis ? (
                                  <div className="doctor-detail-history-card__fact">
                                    <span className="doctor-detail-history-card__fact-label">Diagnosis</span>
                                    <p className="doctor-detail-history-card__fact-value">{historyItem.diagnosis}</p>
                                  </div>
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

              <div hidden={activeTab !== 'prescription'}>
                <DoctorPrescriptionWorkspace
                  appointment={currentAppointment}
                  patient={patient}
                  consultation={consultation}
                  prescription={prescription}
                  loadingPrescription={loadingPrescription}
                  onDraftChange={setPrescriptionDraft}
                  readOnly={!canEditClinical || isReadOnlyAppointment}
                />
              </div>

              {activeTab === 'followup' && (
                <div className="doctor-detail-followup">
                  {consultation.followUpDate || consultation.followUpNotes ? (
                    <div className="doctor-detail-followup__summary">
                      <div className="doctor-detail-note-card">
                        <p className="doctor-detail-note-card__label">Saved Date</p>
                        <p className="doctor-detail-note-card__value">
                          {consultation.followUpDate ? formatDateTime(consultation.followUpDate) : 'Not scheduled'}
                        </p>
                      </div>
                      <div className="doctor-detail-note-card">
                        <p className="doctor-detail-note-card__label">Saved Notes</p>
                        <p className="doctor-detail-note-card__value">
                          {consultation.followUpNotes || 'No follow-up notes recorded.'}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <div className="doctor-detail-followup__planner">
                    <div className="doctor-detail-followup__calendar">
                      <div className="doctor-detail-followup__header">
                        <div>
                          <p className="doctor-detail-eyebrow mb-1">Follow-up</p>
                          <h3 className="doctor-detail-section-title doctor-detail-section-title--compact">
                            Select a date
                          </h3>
                        </div>
                        {loadingFollowUpCalendar ? (
                          <span className="doctor-detail-followup__loading">Refreshing</span>
                        ) : null}
                      </div>

                      <Calendar
                        minDate={new Date()}
                        onActiveStartDateChange={handleFollowUpMonthChange}
                        onChange={handleFollowUpDateChange}
                        tileClassName={({ date, view }) => {
                          if (view !== 'month') return null;
                          const day = followUpCalendarDayMap.get(toLocalDateValue(date));
                          if (!day) return null;
                          return [
                            day.hasAppointments ? 'doctor-followup-calendar__tile--busy' : '',
                            day.availableSlots === 0 ? 'doctor-followup-calendar__tile--full' : '',
                          ].filter(Boolean).join(' ');
                        }}
                        tileContent={({ date, view }) => {
                          if (view !== 'month') return null;
                          const day = followUpCalendarDayMap.get(toLocalDateValue(date));
                          if (!day?.hasAppointments) return null;
                          return <span className="doctor-followup-calendar__dot"></span>;
                        }}
                        value={followUpSelectedDate}
                      />
                    </div>

                    <div className="doctor-detail-followup__slots">
                      <div className="doctor-detail-followup__header">
                        <div>
                          <p className="doctor-detail-eyebrow mb-1">
                            {followUpSelectedDateValue || 'Selected day'}
                          </p>
                          <h3 className="doctor-detail-section-title doctor-detail-section-title--compact">
                            Available slots
                          </h3>
                        </div>
                      </div>

                      {loadingFollowUpSlots ? (
                        <div className="doctor-detail-followup__slot-skeleton">
                          <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                          Loading slots...
                        </div>
                      ) : followUpSlots.length > 0 ? (
                        <div className="doctor-detail-followup__slot-grid">
                          {followUpSlots.map((slot) => {
                            const slotDateTime = buildFollowUpDateTime(followUpSelectedDate, slot.startTime);
                            const isSelected = selectedFollowUpDateTime === slotDateTime;

                            return (
                              <button
                                className={[
                                  'doctor-followup-slot',
                                  slot.selectable ? 'doctor-followup-slot--available' : 'doctor-followup-slot--disabled',
                                  isSelected ? 'doctor-followup-slot--selected' : '',
                                ].filter(Boolean).join(' ')}
                                disabled={!slot.selectable || isReadOnlyAppointment || savingFollowUp}
                                key={slot.startTime}
                                onClick={() => handleSelectFollowUpSlot(slot)}
                                title={slot.disabledReason || slot.label}
                                data-followup-action="select-slot"
                                type="button"
                              >
                                <span className="doctor-followup-slot__time">{slot.label}</span>
                                <span className="doctor-followup-slot__status">
                                  {slot.status === 'BOOKED'
                                    ? 'Booked'
                                    : slot.status === 'DISABLED'
                                      ? slot.disabledReason || 'Disabled'
                                      : isSelected
                                        ? followUpAction === 'save'
                                          ? 'Saving'
                                          : 'Selected'
                                        : 'Available'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        renderEmptyState(
                          'No slots available',
                          'Choose another date to view follow-up availability.',
                        )
                      )}

                      <label className="doctor-detail-followup__notes">
                        <span>Follow-up notes</span>
                        <textarea
                          className="form-control doctor-prescription-input doctor-prescription-input--textarea"
                          disabled={isReadOnlyAppointment || savingFollowUp}
                          onBlur={handleFollowUpNotesBlur}
                          onChange={(event) => setFollowUpNotes(event.target.value)}
                          placeholder="Add concise notes for the next appointment..."
                          rows="4"
                          value={followUpNotes}
                        />
                      </label>

                      <div className="doctor-detail-followup__actions">
                        {canCancelFollowUp ? (
                          <button
                            className="btn btn-outline-danger"
                            disabled={savingFollowUp}
                            onClick={handleCancelFollowUp}
                            data-followup-action="cancel"
                            type="button"
                          >
                            {followUpAction === 'cancel' ? 'Cancelling...' : 'Cancel follow-up'}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
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
                  className="btn btn-outline-success"
                  disabled={!canStartConsultation}
                  onClick={handleStartConsultation}
                  title={
                    hasStarted
                      ? 'Consultation already started'
                      : !hasAppointmentTimeArrived
                        ? 'Consultation can only be started when the appointment time arrives'
                        : isCancelledAppointment || isReadOnlyAppointment
                          ? 'This appointment cannot be started'
                          : 'Start consultation'
                  }
                  type="button"
                >
                  <i className="bi bi-play-circle me-2"></i>
                  {startingConsultation ? 'Starting...' : hasStarted ? 'Started' : 'Start Consultation'}
                </button>
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
                    !hasStarted
                      ? 'Start the consultation first'
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
                  disabled={!canEditClinical || completingAppointment}
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
