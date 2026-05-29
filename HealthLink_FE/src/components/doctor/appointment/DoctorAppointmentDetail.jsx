import React, { useCallback, useEffect, useMemo, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-calendar/dist/Calendar.css';
import '../Css/DoctorDashboard.css';
import { toast } from 'react-toastify';
import { collection, getDocs, query, where } from 'firebase/firestore';
import DoctorPrescriptionWorkspace from '../prescription/DoctorPrescriptionWorkspace';
import ConsultationNotesTab from './tabs/ConsultationNotesTab';
import MedicalHistoryTab from './tabs/MedicalHistoryTab';
import SharedRecordsTab from './tabs/SharedRecordsTab';
import FollowUpTab from './tabs/FollowUpTab';
import { appointmentService } from '../../../api/appointmentApi';
import { consultationApi } from '../../../api/consultationApi';
import { prescriptionService } from '../../../api/prescriptionApi';
import { useAuth } from '../../../context/AuthContext';
import { useChat } from '../../../context/ChatContext';
import { db } from '../../../firebase';
import {
  toLocalDateValue,
  toMonthValue,
  buildFollowUpDateTime,
  normalizeStatus,
  formatDate,
  formatCompactDate,
  formatTime,
  formatDateTime,
  getStatusClassName,
  getTypeClassName,
  getTypeIcon,
  buildConsultation,
  getPatientInitials,
  calculateAge,
} from '../helper/tabHelpers';
import { vitalSignApi } from '../../../api/vitalSignApi';

const TABS = [
  { id: 'notes', label: 'Consultation Notes', icon: 'bi-journal-text' },
  { id: 'history', label: 'Medical History', icon: 'bi-clock-history' },
  { id: 'shared', label: 'Shared Records', icon: 'bi-folder2-open' },
  { id: 'prescription', label: 'Prescription', icon: 'bi-capsule-pill' },
  { id: 'followup', label: 'Follow-up', icon: 'bi-calendar-check' },
];

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
  const [latestVitalSign, setLatestVitalSign] = useState({
    heartRate: 78,
    bloodPressureSystolic: 125,
    bloodPressureDiastolic: 82,
    oxygenSaturation: 98,
    temperature: 37.2,
    respiratoryRate: 16,
    source: 'HomeDevice',
    deviceName: 'Omron X7 Smart',
    measuredAt: new Date().toISOString(),
    notes: 'Patient reports feeling well this morning.',
  });
  const [loadingVitalSign, setLoadingVitalSign] = useState(false);
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

  const loadLatestVitalSign = useCallback(async () => {
    if (!appointmentId) return;

    setLoadingVitalSign(true);

    try {
      const data = await vitalSignApi.getLatestAppointmentVitalSign(appointmentId);
      setLatestVitalSign(data || {
        heartRate: 78,
        bloodPressureSystolic: 125,
        bloodPressureDiastolic: 82,
        oxygenSaturation: 98,
        temperature: 37.2,
        respiratoryRate: 16,
        source: 'HomeDevice',
        deviceName: 'Omron X7 Smart',
        measuredAt: new Date().toISOString(),
        notes: 'Patient reports feeling well this morning.',
      });
    } catch (error) {
      console.error('Error loading vital signs:', error);
      setLatestVitalSign({
        heartRate: 78,
        bloodPressureSystolic: 125,
        bloodPressureDiastolic: 82,
        oxygenSaturation: 98,
        temperature: 37.2,
        respiratoryRate: 16,
        source: 'HomeDevice',
        deviceName: 'Omron X7 Smart',
        measuredAt: new Date().toISOString(),
        notes: 'Patient reports feeling well this morning.',
      });
    } finally {
      setLoadingVitalSign(false);
    }
  }, [appointmentId]);

  const formatVitalSource = (source) => {
    switch (source) {
      case 'HomeDevice':
        return 'Home device';
      case 'Manual':
        return 'Manual measurement';
      default:
        return source || 'N/A';
    }
  };

  useEffect(() => {
    loadLatestVitalSign();
  }, [loadLatestVitalSign]);
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
    const consultationData = buildConsultation(appointmentDetail || appointment);

    if (!targetAppointmentId) {
      toast.error('Appointment data is not ready yet');
      return false;
    }
    if (!followUpDate) {
      toast.error('Please select an available follow-up slot');
      return false;
    }
    if (consultationData.followUpAppointmentId) {
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
    const consultationData = buildConsultation(appointmentDetail || appointment);

    if (!targetAppointmentId) {
      toast.error('Appointment data is not ready yet');
      return;
    }
    if (consultationData.followUpAppointmentId) {
      toast.error('Follow-up appointment has already been created');
      return;
    }
    if (!consultationData.followUpDate && !consultationData.followUpNotes) {
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

  const VitalItem = ({ label, value, unit, icon, muted = false }) => (
    <div className={`doctor-vital-item ${muted ? 'doctor-vital-item--muted' : ''}`}>
      <div className="doctor-vital-item__icon">
        <i className={`bi ${icon}`}></i>
      </div>

      <div>
        <div className="doctor-vital-item__label">{label}</div>
        <div className="doctor-vital-item__value">
          {value || 'N/A'}
          {value && unit ? <span> {unit}</span> : null}
        </div>
      </div>
    </div>
  );

  const renderPreConsultationVitals = () => {
    if (loadingVitalSign) {
      return (
        <section className="doctor-detail-vitals-card">
          <div className="d-flex align-items-center gap-2 text-muted">
            <span className="spinner-border spinner-border-sm" />
            Loading pre-consultation vitals...
          </div>
        </section>
      );
    }

    if (!latestVitalSign) {
      return (
        <section className="doctor-detail-vitals-card doctor-detail-vitals-card--empty">
          <div>
            <h3 className="doctor-detail-section-title doctor-detail-section-title--compact">
              Pre-consultation vitals
            </h3>
            <p className="text-muted mb-0">
              The patient has not submitted vital signs for this appointment yet.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={loadLatestVitalSign}
          >
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
          </button>
        </section>
      );
    }

    const bloodPressure =
      latestVitalSign.bloodPressureSystolic && latestVitalSign.bloodPressureDiastolic
        ? `${latestVitalSign.bloodPressureSystolic}/${latestVitalSign.bloodPressureDiastolic}`
        : null;

    return (
      <section className="doctor-detail-vitals-card">
        <div className="doctor-detail-vitals-header">
          <div>
            <h3 className="doctor-detail-section-title doctor-detail-section-title--compact">
              Pre-consultation vitals
            </h3>
            <p className="text-muted small mb-0">
              Measured at {formatDateTime(latestVitalSign.measuredAt)}
            </p>
          </div>

          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={loadLatestVitalSign}
          >
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
          </button>
        </div>

        <div className="doctor-vitals-grid">
          <VitalItem
            label="Heart rate"
            value={latestVitalSign.heartRate}
            unit="bpm"
            icon="bi-heart-pulse"
          />

          <VitalItem
            label="Blood pressure"
            value={bloodPressure}
            unit="mmHg"
            icon="bi-activity"
          />

          <VitalItem
            label="SpO₂"
            value={latestVitalSign.oxygenSaturation}
            unit="%"
            icon="bi-lungs"
          />

          <VitalItem
            label="Temperature"
            value={latestVitalSign.temperature}
            unit="°C"
            icon="bi-thermometer-half"
          />

          <VitalItem
            label="Respiratory rate"
            value={latestVitalSign.respiratoryRate}
            unit="breaths/min"
            icon="bi-wind"
          />

          <VitalItem
            label="Measurement method"
            value={formatVitalSource(latestVitalSign.source)}
            icon="bi-house-heart"
            muted
          />
        </div>

        {latestVitalSign.deviceName ? (
          <div className="doctor-vitals-note">
            <strong>Device:</strong> {latestVitalSign.deviceName}
          </div>
        ) : null}

        {latestVitalSign.notes ? (
          <div className="doctor-vitals-note">
            <strong>Patient notes:</strong> {latestVitalSign.notes}
          </div>
        ) : null}
      </section>
    );
  };

  return (
    <div className="doctor-detail-layout doctor-detail-shell">
      <div className="doctor-detail-back">
        <button className="btn btn-link p-0 text-decoration-none" onClick={() => onBack?.()} type="button">
          <i className="bi bi-arrow-left me-2"></i>
          Back to appointments
        </button>
      </div>

      <div className="doctor-detail-columns">
        <section className="doctor-detail-summary-card">
          <div className="doctor-detail-summary-card__main">
            <div className="doctor-detail-summary-card__main-row">
              <span className="doctor-detail-appointment-id">
                <i className="bi bi-hash"></i>
                {'Appointment ID: '}{currentAppointment?.appointmentID || currentAppointment?.appointmentId || 'N/A'}
              </span>
              <span className={getStatusClassName(currentAppointment?.status)}>
                {currentAppointment?.status || 'Unknown'}
              </span>
            </div>
            <div className="doctor-detail-summary-card__chips">
              <span className={getTypeClassName(currentAppointment?.consultationType)}>
                {currentAppointment?.consultationType || 'Consultation'}
              </span>
              <span className="doctor-detail-chip">
                {formatCompactDate(currentAppointment?.appointmentTime)}
              </span>
              <span className="doctor-detail-chip">
                {formatTime(currentAppointment?.appointmentTime)}
              </span>
            </div>
          </div>

          <div className="doctor-detail-summary-card__visit">
            <div className="doctor-detail-summary-card__visit-header">
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
                </div>
                <span className="doctor-detail-summary-card__email">
                  {patientEmail}
                </span>
                <div className="doctor-detail-summary-card__meta">
                  <span className="doctor-meta-badge">
                    <i className="bi bi-cake2"></i>
                    {calculateAge(patient?.dateOfBirth)} yrs
                  </span>
                  <span className="doctor-meta-badge">
                    <i className="bi bi-person"></i>
                    {patient?.gender || 'Gender N/A'}
                  </span>
                  <span className="doctor-meta-badge">
                    <i className="bi bi-telephone"></i>
                    {patient?.phoneNumber || appointmentDetail?.patientPhone || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {loadingVitalSign ? (
              <div className="doctor-vital-section">
                <span className="doctor-vital-badge doctor-vital-badge--loading">
                  <span className="spinner-border spinner-border-sm" role="status" />
                </span>
              </div>
            ) : latestVitalSign ? (
              <>
                <div className="doctor-vital-section__header">
                  <i className="bi bi-activity"></i>
                  <span>Vital Signs</span>
                </div>
                <div className="doctor-vital-section">
                  <div className="doctor-vital-strip">
                    {latestVitalSign.heartRate ? (
                      <span className="doctor-vital-badge" title="Heart rate">
                        <i className="bi bi-heart-pulse"></i>
                        <span className="doctor-vital-badge__value">{latestVitalSign.heartRate}</span>
                        <span className="doctor-vital-badge__unit">bpm</span>
                      </span>
                    ) : null}
                    {latestVitalSign.bloodPressureSystolic ? (
                      <span className="doctor-vital-badge" title="Blood pressure">
                        <i className="bi bi-activity"></i>
                        <span className="doctor-vital-badge__value">
                          {latestVitalSign.bloodPressureSystolic}/{latestVitalSign.bloodPressureDiastolic || '?'}
                        </span>
                        <span className="doctor-vital-badge__unit">mmHg</span>
                      </span>
                    ) : null}
                    {latestVitalSign.oxygenSaturation ? (
                      <span className="doctor-vital-badge" title="SpO₂">
                        <i className="bi bi-lungs"></i>
                        <span className="doctor-vital-badge__value">{latestVitalSign.oxygenSaturation}</span>
                        <span className="doctor-vital-badge__unit">%</span>
                      </span>
                    ) : null}
                    {latestVitalSign.temperature ? (
                      <span className="doctor-vital-badge" title="Temperature">
                        <i className="bi bi-thermometer-half"></i>
                        <span className="doctor-vital-badge__value">{latestVitalSign.temperature}</span>
                        <span className="doctor-vital-badge__unit">°C</span>
                      </span>
                    ) : null}
                    {latestVitalSign.respiratoryRate ? (
                      <span className="doctor-vital-badge" title="Respiratory rate">
                        <i className="bi bi-wind"></i>
                        <span className="doctor-vital-badge__value">{latestVitalSign.respiratoryRate}</span>
                        <span className="doctor-vital-badge__unit">br/pm</span>
                      </span>
                    ) : null}
                  </div>
                </div>
              </>
            ) : null}
            <p className="doctor-detail-eyebrow mb-1"><i className="bi bi-chat-dots me-1"></i>Reason for Visit</p>
            <p className={`doctor-detail-summary-card__reason ${visitReason ? '' : 'doctor-detail-summary-card__reason--empty'}`}>
              {visitReason || 'No reason shared yet.'}
            </p>
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
          {activeTab === 'notes' ? (
            <ConsultationNotesTab
              loadingAppointment={loadingAppointment}
              visitReason={visitReason}
              canEditClinical={canEditClinical}
              isReadOnlyAppointment={isReadOnlyAppointment}
              savingNotes={savingNotes}
              notesDraft={notesDraft}
              onNotesChange={handleNotesDraftChange}
              onSaveNotes={handleSaveNotes}
            />
          ) : null}
          {activeTab === 'history' ? (
            <MedicalHistoryTab
              loadingHistory={loadingHistory}
              completedHistory={completedHistory}
              selectedHistoryAppointment={selectedHistoryAppointment}
              loadingHistorySnapshot={loadingHistorySnapshot}
              selectedHistoryConsultation={selectedHistoryConsultation}
              onViewAppointmentDetail={handleViewAppointmentDetail}
              renderEmptyState={renderEmptyState}
              formatCompactDate={formatCompactDate}
              formatTime={formatTime}
              formatDate={formatDate}
              getStatusClassName={getStatusClassName}
              getTypeIcon={getTypeIcon}
            />
          ) : null}
          {activeTab === 'shared' ? <SharedRecordsTab doctorId={effectiveDoctorId} patientId={patientId} /> : null}
          <div hidden={activeTab !== 'prescription'} className="doctor-detail-prescription-panel">
            <DoctorPrescriptionWorkspace
              appointment={currentAppointment}
              patient={patient}
              consultation={consultation}
              prescription={prescription}
              loadingPrescription={loadingPrescription}
              onDraftChange={setPrescriptionDraft}
               readOnly={isReadOnlyAppointment}
            />
          </div>
          {activeTab === 'followup' ? (
            <FollowUpTab
              canEditFollowUp={canEditFollowUp}
              isReadOnlyAppointment={isReadOnlyAppointment}
              consultation={consultation}
              formatDateTime={formatDateTime}
              loadingFollowUpCalendar={loadingFollowUpCalendar}
              followUpCalendarDayMap={followUpCalendarDayMap}
              followUpSelectedDate={followUpSelectedDate}
              toLocalDateValue={toLocalDateValue}
              onFollowUpMonthChange={handleFollowUpMonthChange}
              onFollowUpDateChange={handleFollowUpDateChange}
              loadingFollowUpSlots={loadingFollowUpSlots}
              followUpSlots={followUpSlots}
              buildFollowUpDateTime={buildFollowUpDateTime}
              selectedFollowUpDateTime={selectedFollowUpDateTime}
              savingFollowUp={savingFollowUp}
              onSelectFollowUpSlot={handleSelectFollowUpSlot}
              selectedScheduleLabel={selectedScheduleLabel}
              canCancelFollowUp={canCancelFollowUp}
              onCancelFollowUp={handleCancelFollowUp}
              followUpAction={followUpAction}
              onConfirmFollowUp={handleConfirmFollowUp}
              currentAppointment={currentAppointment}
              getTypeIcon={getTypeIcon}
              followUpNotes={followUpNotes}
              onFollowUpNotesChange={setFollowUpNotes}
              renderEmptyState={renderEmptyState}
            />
          ) : null}
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
      </div>

      {showCompleteConfirmModal ? (
        <div className="modal show d-block doctor-detail-modal-overlay" tabIndex="-1">
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
