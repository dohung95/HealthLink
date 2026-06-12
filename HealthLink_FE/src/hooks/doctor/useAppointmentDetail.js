import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '@context/AuthContext';
import { useChat } from '@context/ChatContext';
import { appointmentService } from '@api/appointmentApi';
import { consultationApi } from '@api/consultationApi';
import { prescriptionService } from '@api/prescriptionApi';
import { buildConsultation, normalizeStatus } from '@utils/doctor/tabHelpers';
import { useAppointmentData } from './useAppointmentData';
import { useVitalSigns } from './useVitalSigns';
import { useConsultationNotes } from './useConsultationNotes';
import { useChatVideo } from './useChatVideo';
import { useFollowUp } from './useFollowUp';

export function useAppointmentDetail({ appointment, patient, doctorId: currentDoctorId, onBack, onOpenAppointmentById }) {
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
  const [startingConsultation, setStartingConsultation] = useState(false);
  const [completingAppointment, setCompletingAppointment] = useState(false);
  const [prescriptionDraft, setPrescriptionDraft] = useState(null);
  const [copyPrescription, setCopyPrescription] = useState(true);
  const [nowTick, setNowTick] = useState(Date.now());

  const appointmentData = useAppointmentData(appointmentId, patientId, doctorId);

  useEffect(() => {
    const appointmentTime = appointment?.appointmentTime
      ? new Date(appointment.appointmentTime).getTime()
      : null;
    if (!appointmentTime || appointmentTime <= Date.now()) return;

    const msUntilArrival = appointmentTime - Date.now();
    if (msUntilArrival <= 0) {
      setNowTick(Date.now());
      return;
    }

    const timer = setTimeout(() => {
      setNowTick(Date.now());
    }, msUntilArrival + 100);

    return () => clearTimeout(timer);
  }, [appointment?.appointmentTime]);
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
    Boolean(consultation.followUpDate || followUp.selectedFollowUpDateTime),
    [consultation.followUpDate, followUp.selectedFollowUpDateTime]);

  const rendered = useMemo(() => {
    const statusKey = normalizeStatus(currentAppointment?.status);
    const patientName = patient?.fullName || currentAppointment?.patientName || 'Unknown patient';
    const patientEmail = patient?.email || patient?.user?.email || appointmentData.appointmentDetail?.patientEmail || 'N/A';
    const completedHistory = appointmentData.medicalHistory?.appointments?.filter(
      (item) => normalizeStatus(item.status) === 'completed',
    ) || [];
    const appointmentTime = currentAppointment?.appointmentTime ? new Date(currentAppointment.appointmentTime) : null;
    const hasAppointmentTimeArrived = appointmentTime ? appointmentTime <= new Date(nowTick) : false;
    const hasStarted = Boolean(consultation.startTime || currentAppointment?.consultationStartTime);
    const isScheduledAppointment = statusKey === 'scheduled';
    const isInConsultationAppointment = statusKey === 'inconsultation' || statusKey === 'inprogress';
    const isReadOnlyAppointment = statusKey === 'completed';
    const isCancelledAppointment = statusKey === 'cancelled' || statusKey === 'canceled';
    const canStartConsultation =
      isScheduledAppointment && hasAppointmentTimeArrived && !hasStarted && !startingConsultation;
    const canEditClinical =
      (isScheduledAppointment || isInConsultationAppointment) &&
      hasStarted &&
      !isReadOnlyAppointment &&
      !isCancelledAppointment;
    const canEditPrescription = canEditClinical;
    const canEditFollowUp = canEditClinical && !isReadOnlyAppointment && !isCancelledAppointment;
    const joinDisabled = !hasStarted || isReadOnlyAppointment || isCancelledAppointment;
    const prescriptionLockReason = isReadOnlyAppointment
      ? 'This appointment is completed. Prescription editing is no longer available.'
      : isCancelledAppointment
        ? 'This appointment was cancelled. Prescription editing is not available.'
        : !hasStarted
          ? 'Start the consultation when the appointment time arrives to create a prescription.'
          : 'Prescription editing is not available for this appointment.';
    const actionLabel = currentAppointment?.consultationType === 'Chat'
      ? 'Open Chat'
      : `Join ${currentAppointment?.consultationType || 'Consultation'}`;
    const visitReason = [
      currentAppointment?.reason, currentAppointment?.symptoms,
      appointmentData.appointmentDetail?.reason, appointmentData.appointmentDetail?.symptoms,
    ].find((v) => typeof v === 'string' && v.trim()) || '';

    return {
      statusKey, patientName, patientEmail, completedHistory, appointmentTime,
      hasAppointmentTimeArrived, hasStarted, isReadOnlyAppointment, isCancelledAppointment,
      canStartConsultation, canEditClinical, canEditPrescription, canEditFollowUp,
      joinDisabled, prescriptionLockReason, actionLabel, visitReason,
    };
  }, [currentAppointment, patient, appointmentData.medicalHistory, appointmentData.appointmentDetail, consultation, startingConsultation, nowTick]);

  const handleStartConsultation = useCallback(async () => {
    if (!appointmentId || startingConsultation) return;
    setStartingConsultation(true);
    try {
      await consultationApi.startAppointmentConsultation(appointmentId);
      toast.success('Consultation started');
      await appointmentData.refreshAppointmentData({ showToast: false });
    } catch (error) {
      console.error('Error starting consultation:', error);
      toast.error(error.response?.data?.message || 'Failed to start consultation');
    } finally {
      setStartingConsultation(false);
    }
  }, [appointmentId, startingConsultation, appointmentData.refreshAppointmentData]);

  const handleCompleteAppointment = useCallback(async () => {
    if (!appointmentId) return;
    const currentConsultation = buildConsultation(appointmentData.appointmentDetail || appointment);
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

    setCompletingAppointment(true);
    setShowCompleteConfirmModal(false);

    try {
      if (prescriptionPayload) {
        await prescriptionService.createPrescription(prescriptionPayload);
        appointmentData.refreshAppointmentData({ showToast: false });
      }

      const completionResult = await appointmentService.completeAppointment(appointmentId, { copyPrescription });
      const followUpAppointmentId = completionResult?.followUpAppointment?.appointmentId ||
        completionResult?.followUpAppointment?.appointmentID || null;

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
      toast.error('Failed to complete appointment');
    } finally {
      setCompletingAppointment(false);
    }
  }, [appointmentId, appointment, appointmentData, prescriptionDraft, onBack, onOpenAppointmentById]);

  const selectedHistoryConsultation = useMemo(
    () => buildConsultation(appointmentData.selectedHistoryAppointment),
    [appointmentData.selectedHistoryAppointment],
  );

  const canCancelFollowUp = useMemo(() =>
    Boolean(
      currentAppointment?.appointmentId &&
      hasPendingFollowUp &&
      !consultation.followUpAppointmentId &&
      rendered.canEditFollowUp,
    ),
    [currentAppointment?.appointmentId, hasPendingFollowUp, consultation.followUpAppointmentId, rendered.canEditFollowUp]);

  const getLockedActionMessage = useCallback(() => {
    if (!rendered.hasAppointmentTimeArrived) return 'Appointment time has not arrived yet.';
    if (!rendered.hasStarted) return 'Please start the consultation first.';
    return null;
  }, [rendered.hasAppointmentTimeArrived, rendered.hasStarted]);

  const showLockedActionToast = useCallback(() => {
    const message = getLockedActionMessage();
    if (message) {
      toast.info(message);
      return true;
    }
    return false;
  }, [getLockedActionMessage]);

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
    ...appointmentData,
    ...vitals,
    ...notes,
    ...followUp,
    ...chatVideo,
    ...rendered,
    canCancelFollowUp,
    hasPendingFollowUp,
    effectiveDoctorId,
    currentAppointment,
    consultation,
    selectedHistoryConsultation,
    handleStartConsultation,
    handleCompleteAppointment,
    handleChat: chatVideo.handleChat,
    handleVideoCall: chatVideo.handleVideoCall,
    getLockedActionMessage,
    showLockedActionToast,
    onLockedAction: showLockedActionToast,
  };
}
