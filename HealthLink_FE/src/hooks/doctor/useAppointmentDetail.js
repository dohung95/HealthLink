import { useCallback, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '@context/AuthContext';
import { useChat } from '@context/ChatContext';
import { appointmentService } from '@api/appointmentApi';
import { consultationApi } from '@api/consultationApi';
import { vitalSignApi } from '@api/vitalSignApi';
import { prescriptionService } from '@api/prescriptionApi';
import { buildDoctorVitalsPayload } from '@utils/doctor/vitalsFormModel';
import { buildConsultation, normalizeStatus } from '@utils/doctor/tabHelpers';
import { useAppointmentData } from './useAppointmentData';
import { useVitalSigns } from './useVitalSigns';
import { useConsultationNotes } from './useConsultationNotes';
import { useChatVideo } from './useChatVideo';
import { useFollowUp } from './useFollowUp';
import { getOrCreateRoom, getRoomMessages } from '@api/chatApi';
import stompChatService from '@services/stompChatService';

export function useAppointmentDetail({ appointment, patient, doctorId: currentDoctorId, activeMiniChatAppt, setActiveMiniChatAppt, onBack, onOpenAppointmentById }) {
  const { roles, initiateCall } = useAuth();
  const { openChatWith } = useChat();

  const patientId = useMemo(() =>
    patient?.patientID || patient?.patientId ||
    appointment?.patientID || appointment?.patientId ||
    appointment?.patient?.patientID || appointment?.patient?.patientId || null,
    [patient, appointment]);

  const appointmentId = useMemo(() =>
    appointment?.appointmentID || appointment?.appointmentId || null,
    [appointment]);

  const doctorId = useMemo(() =>
    currentDoctorId || appointment?.doctorID || appointment?.doctorId ||
    appointment?.doctor?.doctorID || appointment?.doctor?.doctorId || null,
    [currentDoctorId, appointment]);

  const [activeTab, setActiveTab] = useState('notes');
  const [showCompleteConfirmModal, setShowCompleteConfirmModal] = useState(false);
  const [savingEntryVitals, setSavingEntryVitals] = useState(false);
  const [completingAppointment, setCompletingAppointment] = useState(false);
  const [prescriptionDraft, setPrescriptionDraft] = useState(null);
  const [copyPrescription, setCopyPrescription] = useState(true);

  const showMiniChat = activeMiniChatAppt?.appointmentId === appointmentId;
  const setShowMiniChat = (val) => {
    if (val) {
      setActiveMiniChatAppt({
        appointmentId,
        patientId,
        patientName: rendered.patientName,
      });
    } else {
      setActiveMiniChatAppt(null);
    }
  };

  const appointmentData = useAppointmentData(appointmentId, patientId, doctorId);
  const vitals = useVitalSigns(appointmentId);
  const notes = useConsultationNotes(appointmentId, appointment, appointmentData.appointmentDetail);

  const effectiveDoctorId = appointmentData.appointmentDetail?.doctorId ||
    appointmentData.appointmentDetail?.doctorID ||
    appointmentData.appointmentDetail?.doctor?.doctorId ||
    appointmentData.appointmentDetail?.doctor?.doctorID || doctorId;

  const followUp = useFollowUp({
    appointment,
    appointmentDetail: appointmentData.appointmentDetail,
    doctorId: effectiveDoctorId,
    onRefreshAppointment: () => appointmentData.refreshAppointmentData({ showToast: false }),
  });

  const chatVideo = useChatVideo({
    appointment,
    doctorId,
    patientId,
    patient,
    roles,
    openChatWith,
    initiateCall,
  });

  const currentAppointment = useMemo(() => ({
    ...appointment,
    ...appointmentData.appointmentDetail,
    appointmentID: appointmentData.appointmentDetail?.appointmentID ?? appointment?.appointmentID ?? appointment?.appointmentId,
    appointmentId: appointmentData.appointmentDetail?.appointmentId ?? appointment?.appointmentId ?? appointment?.appointmentID,
  }), [appointment, appointmentData.appointmentDetail]);

  const consultation = useMemo(() => buildConsultation(currentAppointment), [currentAppointment]);

  const hasPendingFollowUp = useMemo(() =>
    Boolean(followUp.selectedFollowUpDateTime),
    [followUp.selectedFollowUpDateTime]);

  const rendered = useMemo(() => {
    const statusKey = normalizeStatus(currentAppointment?.status);
    const patientName = patient?.fullName || currentAppointment?.patientName || 'Unknown patient';
    const patientEmail = patient?.email || patient?.user?.email || appointmentData.appointmentDetail?.patientEmail || 'N/A';
    const completedHistory = appointmentData.medicalHistory?.appointments?.filter(
      (item) => normalizeStatus(item.status) === 'completed',
    ) || [];
    const appointmentTime = currentAppointment?.appointmentTime ? new Date(currentAppointment.appointmentTime) : null;
    const hasStarted = Boolean(consultation.startTime || currentAppointment?.consultationStartTime);
    const isScheduledAppointment = statusKey === 'scheduled';
    const isInConsultationAppointment = statusKey === 'inconsultation' || statusKey === 'inprogress';
    const isReadOnlyAppointment = statusKey === 'completed';
    const isCancelledAppointment = statusKey === 'cancelled' || statusKey === 'canceled';
    const canEditClinical =
      (isScheduledAppointment || isInConsultationAppointment) &&
      hasStarted &&
      !isReadOnlyAppointment &&
      !isCancelledAppointment;
    const canEditPrescription = canEditClinical;
    const canEditFollowUp = canEditClinical && !isReadOnlyAppointment && !isCancelledAppointment;
    const joinDisabled = isReadOnlyAppointment || isCancelledAppointment;
    const prescriptionLockReason = isReadOnlyAppointment
      ? 'This appointment is completed. Prescription editing is no longer available.'
      : isCancelledAppointment
        ? 'This appointment was cancelled. Prescription editing is not available.'
        : !hasStarted
          ? 'Start the consultation when the appointment time arrives to create a prescription.'
          : 'Prescription editing is not available for this appointment.';
    const actionLabel = 'Join Room';
    const visitReason = [
      currentAppointment?.reason, currentAppointment?.symptoms,
      appointmentData.appointmentDetail?.reason, appointmentData.appointmentDetail?.symptoms,
    ].find((v) => typeof v === 'string' && v.trim()) || '';

    return {
      statusKey, patientName, patientEmail, completedHistory, appointmentTime,
      hasStarted, isReadOnlyAppointment, isCancelledAppointment,
      canEditClinical, canEditPrescription, canEditFollowUp,
      joinDisabled, prescriptionLockReason, actionLabel, visitReason,
    };
  }, [currentAppointment, patient, appointmentData.medicalHistory, appointmentData.appointmentDetail, consultation]);

  const handleSaveVitalsAndEnterWorkspace = useCallback(async (form) => {
    if (!appointmentId || !patientId) {
      toast.error('Appointment or patient information is missing. Please refresh and try again.');
      return false;
    }

    setSavingEntryVitals(true);

    try {
      const payload = buildDoctorVitalsPayload({ form, patientId, appointmentId });
      const savedVitalSign = await vitalSignApi.createVitalSign(payload);
      vitals.setLatestVitalSign(savedVitalSign);

      if (!rendered.hasStarted) {
        await consultationApi.startAppointmentConsultation(appointmentId);
      }

      await appointmentData.refreshAppointmentData({ showToast: false });
      toast.success('Vitals saved. Consultation workspace is ready.');
      return true;
    } catch (error) {
      console.error('Error saving consultation vitals:', error);
      toast.error(
        error.response?.data?.message ||
        error.response?.data ||
        error.message ||
        'Failed to save vitals and open workspace.'
      );
      return false;
    } finally {
      setSavingEntryVitals(false);
    }
  }, [appointmentId, patientId, rendered.hasStarted, vitals, appointmentData]);

  const handleCompleteAppointment = useCallback(async () => {
    if (!appointmentId) return;
    const appointmentToComplete = appointmentData.appointmentDetail || appointment;
    console.log('--- DEBUG COMPLETE ---');
    console.log('Appointment ID:', appointmentId);
    console.log('Status:', appointmentToComplete?.status);
    console.log('Consultation Start Time:', appointmentToComplete?.consultationStartTime);
    const currentConsultation = buildConsultation(appointmentToComplete);
    console.log('Current Consultation:', currentConsultation);
    
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
        : String(row?.timing || '').split(',').map((v) => v.trim()).filter(Boolean);
      return [...new Set(source.map((v) => String(v).toUpperCase()).filter(Boolean))];
    };
    const incompleteRow = draftRows.find((row) => {
      const quantity = Number(row?.quantity);
      const totalSupplyDays = Number(row?.totalSupplyDays);
      const timings = getRowTimings(row);
      return !Number.isFinite(quantity) || quantity < 1 ||
        !Number.isFinite(totalSupplyDays) || totalSupplyDays < 1 || timings.length === 0;
    });

    if (!appointmentData.prescription && incompleteRow) {
      toast.error('Please complete quantity, supply days, and timing for all prescribed medications.');
      return;
    }

    const prescriptionPayload = !appointmentData.prescription && draftRows.length > 0
      ? {
        appointmentId,
        diagnosis: prescriptionDraft?.diagnosis?.trim() ||
          appointmentData.appointmentDetail?.consultation?.diagnosis ||
          appointmentData.appointmentDetail?.diagnosis || null,
        notes: appointmentData.appointmentDetail?.consultation?.doctorNotes ||
          appointmentData.appointmentDetail?.doctorNotes || null,
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


    const consType = appointmentToComplete?.consultationType?.toUpperCase();
    if (['VIDEO', 'AUDIO', 'CHAT', 'ONLINE'].includes(consType)) {
      try {
        setCompletingAppointment(true);
        const room = await getOrCreateRoom(patientId, appointmentId);
        if (room && room.chatRoomId) {
          const msgs = await getRoomMessages(room.chatRoomId);
          const startTime = appointmentToComplete?.consultation?.startTime || appointmentToComplete?.appointmentTime;
          const startTimestamp = new Date(startTime).getTime();
          
          const hasCommunication = msgs.some(m => new Date(m.timestamp || m.sentAt).getTime() >= startTimestamp);
          
          if (!hasCommunication) {
            toast.error("Cannot complete appointment: The doctor must exchange information (messages or calls) with the patient first.");
            setCompletingAppointment(false);
            setShowCompleteConfirmModal(false);
            return;
          }
        }
      } catch (err) {
        console.error('Error checking communication:', err);
      } finally {
        // Reset spinner if we passed the check, as it will be set again below
        setCompletingAppointment(false);
      }
    }

    if (notes.notesDraft?.diagnosis || notes.notesDraft?.doctorNotes || notes.notesDraft?.treatmentPlan) {
      try {
        await notes.handleSaveNotes();
      } catch (_) {}
    }

    setCompletingAppointment(true);
    setShowCompleteConfirmModal(false);

    try {
      if (prescriptionPayload) {
        await prescriptionService.createPrescription(prescriptionPayload);
        appointmentData.refreshAppointmentData({ showToast: false });
      }

      if (followUp.selectedFollowUpDateTime) {
        await followUp.saveFollowUp(followUp.selectedFollowUpDateTime, followUp.followUpNotes, null);
      }

      const completionResult = await appointmentService.completeAppointment(appointmentId, { copyPrescription });

      
      // Refresh local data to change status immediately
      await appointmentData.refreshAppointmentData({ showToast: false });

      const followUpAppointmentId = completionResult?.followUpAppointment?.appointmentId ||
        completionResult?.followUpAppointment?.appointmentID || null;

      try {
        const room = await getOrCreateRoom(appointmentToComplete.patient.patientId, appointmentId);
        if (room && room.chatRoomId) {
          stompChatService.sendMessage(
            room.chatRoomId,
            appointmentToComplete.doctor.doctorId,
            appointmentToComplete.patient.patientId,
            "[SYSTEM_BLOCK_UPDATE]"
          );
        }
      } catch (err) {
        console.error('Failed to send STOMP block signal:', err);
      }

      if (followUpAppointmentId) {
        toast.success(completionResult?.createdFollowUp
          ? 'Appointment completed and follow-up scheduled'
          : 'Appointment completed. Follow-up appointment is scheduled.');
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
      // toast.error('Failed to complete appointment');
      const errorMsg = error.response?.data?.message || 'Failed to complete appointment';
      toast.error(errorMsg);
    } finally {
      setCompletingAppointment(false);
    }
  }, [appointmentId, appointment, appointmentData, notes, prescriptionDraft, followUp, onBack, onOpenAppointmentById]);

  const selectedHistoryConsultation = useMemo(
    () => buildConsultation(appointmentData.selectedHistoryAppointment),
    [appointmentData.selectedHistoryAppointment],
  );

  return {
    appointment,
    patient,
    patientId,
    doctorId,
    onBack,
    onOpenAppointmentById,
    activeTab,
    setActiveTab,
    showCompleteConfirmModal,
    setShowCompleteConfirmModal,
    completingAppointment,
    copyPrescription,
    setCopyPrescription,
    prescriptionDraft,
    setPrescriptionDraft,
    appointmentDetail: appointmentData.appointmentDetail,
    loadingAppointment: appointmentData.loadingAppointment,
    prescription: appointmentData.prescription,
    loadingPrescription: appointmentData.loadingPrescription,
    medicalHistory: appointmentData.medicalHistory,
    loadingHistory: appointmentData.loadingHistory,
    selectedHistoryAppointment: appointmentData.selectedHistoryAppointment,
    loadingHistorySnapshot: appointmentData.loadingHistorySnapshot,
    handleViewAppointmentDetail: appointmentData.handleViewAppointmentDetail,
    refreshAppointmentData: appointmentData.refreshAppointmentData,
    latestVitalSign: vitals.latestVitalSign,
    loadingVitalSign: vitals.loadingVitalSign,
    savingEntryVitals,
    handleSaveVitalsAndEnterWorkspace,
    notesDraft: notes.notesDraft,
    savingNotes: notes.savingNotes,
    handleNotesDraftChange: notes.handleNotesDraftChange,
    handleSaveNotes: notes.handleSaveNotes,
    followUpSelectedDate: followUp.followUpSelectedDate,
    followUpCalendarMonth: followUp.followUpCalendarMonth,
    followUpCalendarDayMap: followUp.followUpCalendarDayMap,
    followUpSlots: followUp.followUpSlots,
    loadingFollowUpSlots: followUp.loadingFollowUpSlots,
    loadingFollowUpCalendar: followUp.loadingFollowUpCalendar,
    selectedFollowUpDateTime: followUp.selectedFollowUpDateTime,
    savingFollowUp: followUp.savingFollowUp,
    followUpAction: followUp.followUpAction,
    followUpNotes: followUp.followUpNotes,
    followUpConsultationType: followUp.followUpConsultationType,
    selectedScheduleLabel: followUp.selectedScheduleLabel,
    hasExistingFollowUp: followUp.hasExistingFollowUp,
    handleFollowUpDateChange: followUp.handleFollowUpDateChange,
    handleFollowUpMonthChange: followUp.handleFollowUpMonthChange,
    handleSelectFollowUpSlot: followUp.handleSelectFollowUpSlot,
    handleConfirmFollowUp: followUp.handleConfirmFollowUp,
    saveFollowUp: followUp.saveFollowUp,
    setFollowUpNotes: followUp.setFollowUpNotes,
    setFollowUpConsultationType: followUp.setFollowUpConsultationType,
    followUpPaymentStatus: followUp.followUpPaymentStatus,
    sendingPaymentRequest: followUp.sendingPaymentRequest,
    handleSendPaymentRequest: followUp.handleSendPaymentRequest,
    setFollowUpPaymentStatus: followUp.setFollowUpPaymentStatus,
    showRescheduleConfirm: followUp.showRescheduleConfirm,
    isRescheduling: followUp.isRescheduling,
    handleInitiateReschedule: followUp.handleInitiateReschedule,
    handleConfirmRescheduleModal: followUp.handleConfirmRescheduleModal,
    handleCancelRescheduleModal: followUp.handleCancelRescheduleModal,
    handleSaveReschedule: followUp.handleSaveReschedule,
    handleCancelReschedule: followUp.handleCancelReschedule,
    statusKey: rendered.statusKey,
    patientName: rendered.patientName,
    patientEmail: rendered.patientEmail,
    completedHistory: rendered.completedHistory,
    appointmentTime: rendered.appointmentTime,
    hasStarted: rendered.hasStarted,
    isReadOnlyAppointment: rendered.isReadOnlyAppointment,
    isCancelledAppointment: rendered.isCancelledAppointment,
    canEditClinical: rendered.canEditClinical,
    canEditPrescription: rendered.canEditPrescription,
    canEditFollowUp: rendered.canEditFollowUp,
    joinDisabled: rendered.joinDisabled,
    prescriptionLockReason: rendered.prescriptionLockReason,
    actionLabel: rendered.actionLabel,
    visitReason: rendered.visitReason,
    hasPendingFollowUp,
    effectiveDoctorId,
    currentAppointment,
    consultation,
    selectedHistoryConsultation,
    handleCompleteAppointment,
    handleChat: () => {
      setShowMiniChat(true); // Enable mini-chat tracking
    },
    handleVideoCall: chatVideo.handleVideoCall,
    showMiniChat,
    setShowMiniChat,
  };
}
