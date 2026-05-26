import React, { useCallback, useEffect, useMemo, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-calendar/dist/Calendar.css';
import '../Css/DoctorDashboard.css';
import { toast } from 'react-toastify';
import { collection, getDocs, query, where } from 'firebase/firestore';
import Calendar from 'react-calendar';
import DoctorPrescriptionWorkspace from '../prescription/DoctorPrescriptionWorkspace';
import { appointmentService } from '../../../api/appointmentApi';
import { consultationApi } from '../../../api/consultationApi';
import { prescriptionService } from '../../../api/prescriptionApi';
import { useAuth } from '../../../context/AuthContext';
import { useChat } from '../../../context/ChatContext';
import { db } from '../../../firebase';

const TABS = [
  { id: 'notes', label: 'Consultation Notes', icon: 'bi-journal-text' },
  { id: 'history', label: 'Medical History', icon: 'bi-clock-history' },
  { id: 'shared', label: 'Shared Records', icon: 'bi-folder2-open' },
  { id: 'prescription', label: 'Prescription', icon: 'bi-capsule-pill' },
  { id: 'followup', label: 'Follow-up', icon: 'bi-calendar-check' },
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

const normalizeStatus = (status) => String(status || '').toLowerCase().replace(/[\s_-]/g, '');

const DoctorAppointmentDetail = ({
  appointment,
  patient,
  doctorId: currentDoctorId,
  onBack,
  onOpenAppointmentById,
}) => {
  const [medicalHistory, setMedicalHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [appointmentDetail, setAppointmentDetail] = useState(null);
  const [loadingAppointment, setLoadingAppointment] = useState(false);
  const [prescription, setPrescription] = useState(null);
  const [prescriptionDraft, setPrescriptionDraft] = useState(null);
  const [loadingPrescription, setLoadingPrescription] = useState(false);
  const [selectedHistoryAppointment, setSelectedHistoryAppointment] = useState(null);
  const [loadingHistorySnapshot, setLoadingHistorySnapshot] = useState(false);
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
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCompactDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'N/A';
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
    if (Number.isNaN(birthDate.getTime())) return 'N/A';

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
    const key = normalizeStatus(status);
    if (key === 'completed') return 'doctor-detail-status doctor-detail-status--completed';
    if (key === 'scheduled') return 'doctor-detail-status doctor-detail-status--scheduled';
    if (key === 'cancelled' || key === 'canceled') return 'doctor-detail-status doctor-detail-status--cancelled';
    if (key === 'inprogress') return 'doctor-detail-status doctor-detail-status--progress';
    return 'doctor-detail-status';
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
    refreshAppointmentData();
  }, [refreshAppointmentData]);

  useEffect(() => {
    setSelectedHistoryAppointment(null);
  }, [appointmentId]);

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
    if (!targetAppointmentId) return;

    setLoadingHistorySnapshot(true);
    try {
      const bundle = await fetchAppointmentBundle(targetAppointmentId, { showErrors: true });
      setSelectedHistoryAppointment(bundle);
    } catch (error) {
      console.error('Error loading appointment detail:', error);
      toast.error('Failed to load appointment details');
    } finally {
      setLoadingHistorySnapshot(false);
    }
  };

  const handleFollowUpDateChange = (date) => {
    setFollowUpSelectedDate(date);
    setSelectedFollowUpDateTime(null);
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
    setFollowUpAction('confirm');
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

  const handleSelectFollowUpSlot = (slot) => {
    if (!slot?.selectable || savingFollowUp) {
      return;
    }

    setSelectedFollowUpDateTime(buildFollowUpDateTime(followUpSelectedDate, slot.startTime));
  };

  const handleConfirmFollowUp = async () => {
    await savePendingFollowUp(
      selectedFollowUpDateTime,
      followUpNotes,
      'Follow-up schedule saved',
    );
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
    if (!consultation.followUpDate && !consultation.followUpNotes) {
      setSelectedFollowUpDateTime(null);
      setFollowUpNotes('');
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
  const statusKey = normalizeStatus(currentAppointment?.status);
  const patientName = patient?.fullName || currentAppointment?.patientName || 'Unknown patient';
  const patientEmail = patient?.email || patient?.user?.email || appointmentDetail?.patientEmail || 'N/A';
  const completedHistory =
    medicalHistory?.appointments?.filter((historyItem) => normalizeStatus(historyItem.status) === 'completed') || [];
  const appointmentTime = currentAppointment?.appointmentTime
    ? new Date(currentAppointment.appointmentTime)
    : null;
  const hasAppointmentTimeArrived = appointmentTime
    ? appointmentTime <= new Date()
    : false;
  const hasStarted = Boolean(consultation.startTime || currentAppointment?.consultationStartTime);
  const isReadOnlyAppointment = statusKey === 'completed';
  const isCancelledAppointment = statusKey === 'cancelled' || statusKey === 'canceled';
  const canStartConsultation =
    statusKey === 'scheduled' &&
    hasAppointmentTimeArrived &&
    !hasStarted &&
    !startingConsultation;
  const canEditClinical = statusKey === 'scheduled' && hasStarted;
  const canEditFollowUp = canEditClinical && !isReadOnlyAppointment && !isCancelledAppointment;
  const joinDisabled = !hasStarted || isReadOnlyAppointment || isCancelledAppointment;
  const hasPendingFollowUp = Boolean(consultation.followUpDate || selectedFollowUpDateTime);
  const canCancelFollowUp = Boolean(
    currentAppointment?.appointmentId &&
    hasPendingFollowUp &&
    !consultation.followUpAppointmentId &&
    canEditFollowUp,
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
  const selectedHistoryConsultation = buildConsultation(selectedHistoryAppointment);
  const selectedScheduleLabel = selectedFollowUpDateTime
    ? formatDateTime(selectedFollowUpDateTime)
    : 'No follow-up time selected';

  const renderEmptyState = (title, description) => (
    <div className="doctor-detail-empty">
      <div className="doctor-detail-empty__icon">
        <i className="bi bi-inbox"></i>
      </div>
      <h3 className="doctor-detail-empty__title">{title}</h3>
      <p className="doctor-detail-empty__description">{description}</p>
    </div>
  );

  const renderNotesTab = () => (
    <div className="doctor-notes-workspace doctor-notes-workspace--consultation">
      {loadingAppointment ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <>
          <div className="doctor-notes-chief-card">
            <div className="doctor-notes-chief-card__icon">
              <i className="bi bi-chat-square-text"></i>
            </div>
            <div>
              <p className="doctor-detail-eyebrow mb-1">Chief Complaint</p>
              <p className={`doctor-notes-chief-card__text ${visitReason ? '' : 'doctor-notes-chief-card__text--empty'}`}>
                {visitReason || 'The patient has not shared symptoms or a reason for this appointment yet.'}
              </p>
            </div>
          </div>

          {!canEditClinical && !isReadOnlyAppointment ? (
            <div className="doctor-detail-note-card doctor-notes-lock">
              <p className="doctor-detail-note-card__label">Locked</p>
              <p className="doctor-detail-note-card__value">
                Start the consultation when the appointment time arrives to record diagnosis, notes, and treatment plan.
              </p>
            </div>
          ) : null}

          <div className="doctor-notes-grid">
            <label className="doctor-notes-field">
              <span>Diagnosis</span>
              <textarea
                className="form-control doctor-prescription-input doctor-prescription-input--textarea"
                disabled={!canEditClinical || savingNotes}
                onChange={(event) => handleNotesDraftChange('diagnosis', event.target.value)}
                placeholder="Enter the primary diagnosis..."
                rows="4"
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
                rows="6"
                value={notesDraft.doctorNotes}
              />
            </label>

            <label className="doctor-notes-field doctor-notes-field--full">
              <span>Treatment Plan</span>
              <textarea
                className="form-control doctor-prescription-input doctor-prescription-input--textarea"
                disabled={!canEditClinical || savingNotes}
                onChange={(event) => handleNotesDraftChange('treatmentPlan', event.target.value)}
                placeholder="Outline treatment plan, lifestyle guidance, and next steps..."
                rows="5"
                value={notesDraft.treatmentPlan}
              />
            </label>
          </div>

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
        </>
      )}
    </div>
  );

  const renderHistoryTab = () => (
    <div className="doctor-history-workspace">
      {loadingHistory ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : completedHistory.length > 0 ? (
        <div className="doctor-history-workspace__grid">
          <aside className="doctor-history-list-panel">
            <div className="doctor-history-list-panel__header">
              <p className="doctor-detail-eyebrow mb-1">Past Encounters</p>
              <h3>Completed visits</h3>
            </div>
            <div className="doctor-history-encounter-list">
              {completedHistory.map((historyItem) => {
                const historyId = historyItem.appointmentID || historyItem.appointmentId;
                const isActive =
                  selectedHistoryAppointment?.appointmentID === historyId ||
                  selectedHistoryAppointment?.appointmentId === historyId;

                return (
                  <button
                    className={`doctor-history-encounter ${isActive ? 'doctor-history-encounter--active' : ''}`}
                    key={historyId}
                    onClick={() => handleViewAppointmentDetail(historyId)}
                    type="button"
                  >
                    <span className="doctor-history-encounter__date">
                      {formatCompactDate(historyItem.appointmentTime)}
                    </span>
                    <span className="doctor-history-encounter__title">
                      {historyItem.symptoms || historyItem.reason || 'Completed appointment'}
                    </span>
                    <span className="doctor-history-encounter__meta">
                      <i className="bi bi-clock"></i>
                      {formatTime(historyItem.appointmentTime)}
                    </span>
                    {historyItem.diagnosis ? (
                      <span className="doctor-history-encounter__diagnosis">
                        {historyItem.diagnosis}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="doctor-history-snapshot">
            {loadingHistorySnapshot ? (
              <div className="doctor-detail-followup__slot-skeleton">
                <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                Loading snapshot...
              </div>
            ) : selectedHistoryAppointment ? (
              <>
                <div className="doctor-history-snapshot__header">
                  <div>
                    <p className="doctor-detail-eyebrow mb-1">Medical Record</p>
                    <h3>{formatDate(selectedHistoryAppointment.appointmentTime)}</h3>
                  </div>
                  <span className={getStatusClassName(selectedHistoryAppointment.status)}>
                    {selectedHistoryAppointment.status || 'Completed'}
                  </span>
                </div>

                <div className="doctor-history-snapshot__meta">
                  <span>
                    <i className="bi bi-person-badge"></i>
                    {selectedHistoryAppointment.doctorName || 'Doctor N/A'}
                  </span>
                  <span>
                    <i className={`bi ${getTypeIcon(selectedHistoryAppointment.consultationType)}`}></i>
                    {selectedHistoryAppointment.consultationType || 'Consultation'}
                  </span>
                  <span>
                    <i className="bi bi-clock"></i>
                    {formatTime(selectedHistoryAppointment.appointmentTime)}
                  </span>
                </div>

                <div className="doctor-history-snapshot__sections">
                  <section>
                    <p className="doctor-detail-note-card__label">Diagnosis</p>
                    <p className="doctor-history-snapshot__text">
                      {selectedHistoryConsultation.diagnosis || selectedHistoryAppointment.diagnosis || 'No diagnosis recorded.'}
                    </p>
                  </section>
                  <section>
                    <p className="doctor-detail-note-card__label">Clinical Notes</p>
                    <p className="doctor-history-snapshot__text">
                      {selectedHistoryConsultation.doctorNotes || selectedHistoryAppointment.doctorNotes || 'No clinical notes recorded.'}
                    </p>
                  </section>
                  <section>
                    <p className="doctor-detail-note-card__label">Treatment Plan</p>
                    <p className="doctor-history-snapshot__text">
                      {selectedHistoryConsultation.treatmentPlan || selectedHistoryAppointment.treatmentPlan || 'No treatment plan recorded.'}
                    </p>
                  </section>
                </div>

                {selectedHistoryAppointment?.prescription?.medications?.length ? (
                  <div className="doctor-history-medications">
                    <p className="doctor-detail-note-card__label">Prescribed Medications</p>
                    <div className="doctor-history-medications__list">
                      {selectedHistoryAppointment.prescription.medications.map((medication, index) => (
                        <div className="doctor-history-medications__item" key={`${medication.medicationName || 'medication'}-${index}`}>
                          <strong>{medication.medicationName || medication.brandName || `Medication ${index + 1}`}</strong>
                          <span>{medication.dosage || medication.strength || 'Dose N/A'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              renderEmptyState(
                'Select a completed visit',
                'Choose an encounter from the left to review diagnosis, notes, treatment plan, and prescriptions.',
              )
            )}
          </section>
        </div>
      ) : (
        renderEmptyState(
          'No completed appointments found',
          'Completed visits for this patient will appear here once they become available.',
        )
      )}
    </div>
  );

  const renderSharedRecordsTab = () => (
    <div className="doctor-detail-shared doctor-detail-shared--blank" aria-label="Shared Records"></div>
  );

  const renderFollowUpTab = () => (
    <div className="doctor-detail-followup">
      {!canEditFollowUp && !isReadOnlyAppointment ? (
        <div className="doctor-detail-note-card doctor-notes-lock">
          <p className="doctor-detail-note-card__label">Locked</p>
          <p className="doctor-detail-note-card__value">
            Start the consultation before scheduling a follow-up appointment.
          </p>
        </div>
      ) : null}

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

      <div className="doctor-detail-followup__planner doctor-detail-followup__planner--workspace">
        <div className="doctor-detail-followup__left">
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

          <div className="doctor-detail-followup__visit">
            <p className="doctor-detail-eyebrow mb-2">Visit Details</p>
            <div className="doctor-detail-followup__visit-grid">
              <span>
                <i className={`bi ${getTypeIcon(currentAppointment?.consultationType)}`}></i>
                {currentAppointment?.consultationType || 'Consultation'}
              </span>
              <span>
                <i className="bi bi-clock"></i>
                30 mins
              </span>
            </div>
            <label className="doctor-detail-followup__notes">
              <span>Follow-up notes</span>
              <textarea
                className="form-control doctor-prescription-input doctor-prescription-input--textarea"
                disabled={!canEditFollowUp || savingFollowUp}
                onChange={(event) => setFollowUpNotes(event.target.value)}
                placeholder="Add concise notes for the next appointment..."
                rows="5"
                value={followUpNotes}
              />
            </label>
          </div>
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
                    disabled={!slot.selectable || !canEditFollowUp || savingFollowUp}
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
                            ? 'Selected'
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
        </div>
      </div>

      <div className="doctor-detail-followup__footer">
        <div>
          <p className="doctor-detail-eyebrow mb-1">Selected Schedule</p>
          <strong>{selectedScheduleLabel}</strong>
        </div>
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
          <button
            className="btn btn-primary"
            disabled={!canEditFollowUp || savingFollowUp || !selectedFollowUpDateTime}
            onClick={handleConfirmFollowUp}
            type="button"
          >
            <i className="bi bi-calendar-check me-2"></i>
            {followUpAction === 'confirm' ? 'Saving...' : 'Confirm Follow-up'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="doctor-detail-layout doctor-detail-shell">
      <div className="doctor-detail-back">
        <button className="btn btn-link p-0 text-decoration-none" onClick={() => onBack?.()} type="button">
          <i className="bi bi-arrow-left me-2"></i>
          Back to appointments
        </button>
      </div>

      <section className="doctor-detail-summary-card">
        <div className="doctor-detail-summary-card__main">
          {patient?.avatarUrl ? (
            <img
              className="doctor-detail-avatar doctor-detail-avatar--round"
              src={patient.avatarUrl}
              alt={patientName}
            />
          ) : (
            <div className="doctor-detail-avatar doctor-detail-avatar--fallback doctor-detail-avatar--round">
              {getPatientInitials(patientName)}
            </div>
          )}

          <div className="doctor-detail-summary-card__identity">
            <div className="doctor-detail-summary-card__title-row">
              <h2>{patientName}</h2>
              <span className={getStatusClassName(currentAppointment?.status)}>
                {currentAppointment?.status || 'Unknown'}
              </span>
            </div>
            <div className="doctor-detail-summary-card__meta">
              <span>
                <i className="bi bi-cake2"></i>
                {calculateAge(patient?.dateOfBirth)} yrs
              </span>
              <span>
                <i className="bi bi-person"></i>
                {patient?.gender || 'Gender N/A'}
              </span>
              <span>
                <i className="bi bi-envelope"></i>
                {patientEmail}
              </span>
              <span>
                <i className="bi bi-telephone"></i>
                {patient?.phoneNumber || appointmentDetail?.patientPhone || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        <div className="doctor-detail-summary-card__visit">
          <p className="doctor-detail-eyebrow mb-1">Reason for Visit</p>
          <p className={`doctor-detail-summary-card__reason ${visitReason ? '' : 'doctor-detail-summary-card__reason--empty'}`}>
            {visitReason || 'No reason shared yet.'}
          </p>
          <div className="doctor-detail-summary-card__chips">
            <span className={getTypeClassName(currentAppointment?.consultationType)}>
              <i className={`bi ${getTypeIcon(currentAppointment?.consultationType)}`}></i>
              {currentAppointment?.consultationType || 'Consultation'}
            </span>
            <span className="doctor-detail-chip">
              <i className="bi bi-calendar-event"></i>
              {formatDateTime(currentAppointment?.appointmentTime)}
            </span>
            <span className="doctor-detail-chip">
              ID: {currentAppointment?.appointmentID || currentAppointment?.appointmentId || 'N/A'}
            </span>
          </div>
        </div>
      </section>

      <section className="doctor-detail-card doctor-detail-workspace doctor-detail-workspace--full">
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
              <span className="doctor-detail-tab__label">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="doctor-detail-tab-panel doctor-detail-tab-panel--workspace">
          {activeTab === 'notes' ? renderNotesTab() : null}
          {activeTab === 'history' ? renderHistoryTab() : null}
          {activeTab === 'shared' ? renderSharedRecordsTab() : null}
          <div hidden={activeTab !== 'prescription'} className="doctor-detail-prescription-panel">
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
          {activeTab === 'followup' ? renderFollowUpTab() : null}
        </div>

        <div className="doctor-detail-actionbar doctor-detail-actionbar--workspace doctor-detail-actionbar--consultation">
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
              title={!hasStarted ? 'Start the consultation first' : actionLabel}
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
