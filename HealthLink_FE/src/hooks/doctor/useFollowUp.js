import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { appointmentService } from '@api/appointmentApi';
import { consultationApi } from '@api/consultationApi';
import { buildConsultation, toLocalDateValue, toMonthValue, buildFollowUpDateTime, formatDateTime } from '@utils/doctor/tabHelpers';

export function useFollowUp({ appointment, appointmentDetail, doctorId, onRefreshAppointment }) {
  const [followUpSelectedDate, setFollowUpSelectedDate] = useState(new Date());
  const [followUpCalendarMonth, setFollowUpCalendarMonth] = useState(toMonthValue(new Date()));
  const [followUpSlots, setFollowUpSlots] = useState([]);
  const [followUpCalendarDays, setFollowUpCalendarDays] = useState([]);
  const [selectedFollowUpDateTime, setSelectedFollowUpDateTime] = useState(null);
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [followUpConsultationType, setFollowUpConsultationType] = useState('Consultation');
  const [loadingFollowUpSlots, setLoadingFollowUpSlots] = useState(false);
  const [loadingFollowUpCalendar, setLoadingFollowUpCalendar] = useState(false);
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  const [followUpAction, setFollowUpAction] = useState(null);
  const [followUpPaymentStatus, setFollowUpPaymentStatus] = useState(null);
  const [sendingPaymentRequest, setSendingPaymentRequest] = useState(false);
  const [showRescheduleConfirm, setShowRescheduleConfirm] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [pendingPaymentCancelAt, setPendingPaymentCancelAt] = useState(null);
  const [cancelingPaymentRequest, setCancelingPaymentRequest] = useState(false);
  const [pendingPaymentCountdown, setPendingPaymentCountdown] = useState(0);

  const source = appointmentDetail || appointment;
  const consultation = useMemo(() => buildConsultation(source), [source]);
  const effectiveDoctorId = appointmentDetail?.doctorId || appointmentDetail?.doctorID || appointmentDetail?.doctor?.doctorId || appointmentDetail?.doctor?.doctorID || doctorId;
  const followUpSelectedDateValue = toLocalDateValue(followUpSelectedDate);
  const hasExistingFollowUp = Boolean(consultation.followUpDate || consultation.followUpNotes);
  const appointmentId = source?.appointmentID || source?.appointmentId || null;

  const followUpCalendarDayMap = useMemo(() => {
    const entries = Array.isArray(followUpCalendarDays)
      ? followUpCalendarDays.map((day) => [day.date, day])
      : [];
    return new Map(entries);
  }, [followUpCalendarDays]);

  const selectedScheduleLabel = selectedFollowUpDateTime
    ? formatDateTime(selectedFollowUpDateTime)
    : 'No follow-up time selected';

  useEffect(() => {
    const followUp = buildConsultation(source);
    setFollowUpNotes(followUp.followUpNotes || '');
    setFollowUpConsultationType(
      source?.consultationType || followUp.followUpConsultationType || 'Consultation',
    );

    if (followUp.followUpDate) {
      const nextDate = new Date(followUp.followUpDate);
      if (!Number.isNaN(nextDate.getTime())) {
        const hours = String(nextDate.getHours()).padStart(2, '0');
        const minutes = String(nextDate.getMinutes()).padStart(2, '0');
        setFollowUpSelectedDate(nextDate);
        setFollowUpCalendarMonth(toMonthValue(nextDate));
        setSelectedFollowUpDateTime(buildFollowUpDateTime(nextDate, `${hours}:${minutes}`));
        return;
      }
    }

    const today = new Date();
    setFollowUpSelectedDate(today);
    setFollowUpCalendarMonth(toMonthValue(today));
    setSelectedFollowUpDateTime(null);
  }, [
    source,
    consultation.followUpDate,
    consultation.followUpNotes,
    source?.consultationType,
  ]);

  const loadFollowUpSlots = useCallback(async () => {
    if (!effectiveDoctorId || !followUpSelectedDateValue) return;

    setLoadingFollowUpSlots(true);
    try {
      const data = await appointmentService.getFollowUpSlots(effectiveDoctorId, followUpSelectedDateValue);
      setFollowUpSlots(Array.isArray(data?.slots) ? data.slots : []);
    } catch (error) {
      console.error('Error loading follow-up slots:', error);
      toast.error(error.response?.data?.message || 'Failed to load follow-up slots');
      setFollowUpSlots([]);
    } finally {
      setLoadingFollowUpSlots(false);
    }
  }, [effectiveDoctorId, followUpSelectedDateValue]);

  const loadFollowUpCalendar = useCallback(async () => {
    if (!effectiveDoctorId || !followUpCalendarMonth) return;

    setLoadingFollowUpCalendar(true);
    try {
      const data = await appointmentService.getFollowUpCalendar(effectiveDoctorId, followUpCalendarMonth);
      setFollowUpCalendarDays(Array.isArray(data?.days) ? data.days : []);
    } catch (error) {
      console.error('Error loading follow-up calendar:', error);
      setFollowUpCalendarDays([]);
    } finally {
      setLoadingFollowUpCalendar(false);
    }
  }, [effectiveDoctorId, followUpCalendarMonth]);

  useEffect(() => {
    loadFollowUpSlots();
  }, [loadFollowUpSlots]);

  useEffect(() => {
    loadFollowUpCalendar();
  }, [loadFollowUpCalendar]);

  const handleFollowUpDateChange = useCallback((date) => {
    setFollowUpSelectedDate(date);
    setSelectedFollowUpDateTime(null);
  }, []);

  const handleFollowUpMonthChange = useCallback(({ activeStartDate }) => {
    const monthValue = toMonthValue(activeStartDate);
    if (monthValue) {
      setFollowUpCalendarMonth(monthValue);
    }
  }, []);

  const handleSelectFollowUpSlot = useCallback((slot) => {
    if (!slot?.selectable || savingFollowUp) return;
    setSelectedFollowUpDateTime(buildFollowUpDateTime(followUpSelectedDate, slot.startTime));
  }, [followUpSelectedDate, savingFollowUp]);

  const savePendingFollowUp = useCallback(async (followUpDate, notes, successMessage = null) => {
    const targetAppointmentId = appointmentId;
    if (!targetAppointmentId) {
      toast.error('Appointment data is not ready yet');
      return false;
    }
    if (!followUpDate) {
      toast.error('Please select an available follow-up slot');
      return false;
    }

    setSavingFollowUp(true);
    setFollowUpAction('confirm');
    try {
      const response = await consultationApi.updateAppointmentFollowUp(targetAppointmentId, {
        followUpDate,
        followUpNotes: notes?.trim() || null,
        consultationType: followUpConsultationType,
      });
      if (successMessage) toast.success(successMessage);
      if (onRefreshAppointment) await onRefreshAppointment();
      await loadFollowUpSlots();
      await loadFollowUpCalendar();
      return response?.followUpAppointmentId || true;
    } catch (error) {
      console.error('Error saving follow-up:', error);
      toast.error(error.response?.data?.message || 'Failed to save follow-up');
      return false;
    } finally {
      setSavingFollowUp(false);
      setFollowUpAction(null);
    }
  }, [appointmentId, followUpConsultationType, loadFollowUpCalendar, loadFollowUpSlots, onRefreshAppointment]);

  const handleConfirmFollowUp = useCallback(async () => {
    await savePendingFollowUp(selectedFollowUpDateTime, followUpNotes, 'Follow-up appointment scheduled');
  }, [selectedFollowUpDateTime, followUpNotes, savePendingFollowUp]);

  const handleCancelFollowUp = useCallback(async () => {
    const targetAppointmentId = appointmentId;
    if (!targetAppointmentId) {
      toast.error('Appointment data is not ready yet');
      return;
    }
    if (!consultation.followUpDate && !consultation.followUpNotes && !consultation.followUpAppointmentId) {
      setSelectedFollowUpDateTime(null);
      setFollowUpNotes('');
      return;
    }

    const prevDateTime = selectedFollowUpDateTime;
    const prevNotes = followUpNotes;
    const prevType = followUpConsultationType;

    setSelectedFollowUpDateTime(null);
    setFollowUpNotes('');
    setFollowUpConsultationType(source?.consultationType || 'Consultation');
    setSavingFollowUp(true);
    setFollowUpAction('cancel');
    try {
      await consultationApi.cancelAppointmentFollowUp(targetAppointmentId);
      toast.success('Follow-up selection cancelled');
      if (onRefreshAppointment) await onRefreshAppointment();
      await loadFollowUpSlots();
      await loadFollowUpCalendar();
    } catch (error) {
      console.error('Error cancelling follow-up:', error);
      setSelectedFollowUpDateTime(prevDateTime);
      setFollowUpNotes(prevNotes);
      setFollowUpConsultationType(prevType);
      toast.error(error.response?.data?.message || 'Failed to cancel follow-up');
    } finally {
      setSavingFollowUp(false);
      setFollowUpAction(null);
    }
  }, [appointmentId, consultation, selectedFollowUpDateTime, followUpNotes, followUpConsultationType, source, loadFollowUpCalendar, loadFollowUpSlots, onRefreshAppointment]);

  const handleSendPaymentRequest = useCallback(async () => {
    const targetAppointmentId = appointmentId;
    if (!targetAppointmentId) {
      toast.error('Appointment data is not ready yet');
      return;
    }
    if (!selectedFollowUpDateTime) {
      toast.error('Please select an available follow-up slot');
      return;
    }

    setSendingPaymentRequest(true);
    try {
      // Bước 1: Lưu follow-up data (date, notes, consultationType) trước
      await consultationApi.updateAppointmentFollowUp(targetAppointmentId, {
        followUpDate: selectedFollowUpDateTime,
        followUpNotes: followUpNotes?.trim() || null,
        consultationType: followUpConsultationType,
      });

      // Bước 2: Gửi payment request
      await consultationApi.sendFollowUpPaymentRequest(targetAppointmentId);

      toast.success('Payment request sent to patient');
      setFollowUpPaymentStatus('PENDING_PAYMENT');
      setPendingPaymentCancelAt(Date.now() + 30000);
      if (onRefreshAppointment) await onRefreshAppointment();
      await loadFollowUpSlots();
      await loadFollowUpCalendar();
    } catch (error) {
      console.error('Error sending payment request:', error);
      toast.error(error.response?.data?.message || 'Failed to send payment request');
    } finally {
      setSendingPaymentRequest(false);
    }
  }, [appointmentId, selectedFollowUpDateTime, followUpNotes, followUpConsultationType,
      loadFollowUpCalendar, loadFollowUpSlots, onRefreshAppointment]);

  const handleCancelPendingPayment = useCallback(async () => {
    const targetAppointmentId = appointmentId;
    if (!targetAppointmentId) return;
    setCancelingPaymentRequest(true);
    try {
      await consultationApi.denyFollowUp(targetAppointmentId);
      setFollowUpPaymentStatus('NONE');
      setPendingPaymentCancelAt(null);
      setPendingPaymentCountdown(0);
      toast.info('Payment request cancelled');
      if (onRefreshAppointment) await onRefreshAppointment();
    } catch (error) {
      console.error('Error cancelling payment request:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel payment request');
    } finally {
      setCancelingPaymentRequest(false);
    }
  }, [appointmentId, onRefreshAppointment]);

  const handleInitiateReschedule = useCallback(() => {
    setShowRescheduleConfirm(true);
  }, []);

  const handleConfirmRescheduleModal = useCallback(() => {
    setIsRescheduling(true);
    setShowRescheduleConfirm(false);
  }, []);

  const handleCancelRescheduleModal = useCallback(() => {
    setShowRescheduleConfirm(false);
  }, []);

  const handleSaveReschedule = useCallback(async () => {
    const result = await savePendingFollowUp(selectedFollowUpDateTime, followUpNotes, 'Follow-up rescheduled');
    if (result) {
      setIsRescheduling(false);
    }
  }, [selectedFollowUpDateTime, followUpNotes, savePendingFollowUp]);

  const handleCancelReschedule = useCallback(() => {
    const followUp = buildConsultation(source);
    setIsRescheduling(false);
    if (followUp.followUpDate) {
      const nextDate = new Date(followUp.followUpDate);
      if (!Number.isNaN(nextDate.getTime())) {
        const hours = String(nextDate.getHours()).padStart(2, '0');
        const minutes = String(nextDate.getMinutes()).padStart(2, '0');
        setFollowUpSelectedDate(nextDate);
        setFollowUpCalendarMonth(toMonthValue(nextDate));
        setSelectedFollowUpDateTime(buildFollowUpDateTime(nextDate, `${hours}:${minutes}`));
      }
    }
    setFollowUpNotes(followUp.followUpNotes || '');
    setFollowUpConsultationType(source?.consultationType || followUp.followUpConsultationType || 'Consultation');
  }, [source]);

  useEffect(() => {
    if (!appointmentId) return;
    if (consultation.followUpAppointmentId || consultation.followUpDate) {
      consultationApi.getFollowUpStatus(appointmentId)
        .then((data) => {
          if (data?.status && data.status !== 'NONE') {
            setFollowUpPaymentStatus(data.status);
            if (data.status === 'PENDING_PAYMENT') {
              setPendingPaymentCancelAt(Date.now() + 30000);
            } else {
              setPendingPaymentCancelAt(null);
            }
          }
        })
        .catch(() => {});
    }
  }, [appointmentId, consultation.followUpAppointmentId, consultation.followUpDate]);

  useEffect(() => {
    if (!appointmentId || followUpPaymentStatus !== 'PENDING_PAYMENT') return;

    const interval = setInterval(async () => {
      try {
        const statusData = await consultationApi.getFollowUpStatus(appointmentId);
        const newStatus = statusData?.status;
        if (newStatus && newStatus !== followUpPaymentStatus) {
          setFollowUpPaymentStatus(newStatus);
          if (newStatus !== 'PENDING_PAYMENT') {
            setPendingPaymentCancelAt(null);
            setPendingPaymentCountdown(0);
          }
          if (newStatus === 'PAID') {
            toast.info('Patient has paid. Follow-up created.');
          } else if (newStatus === 'NONE') {
            toast.info('Follow-up request was denied by patient');
          }
          if (onRefreshAppointment) onRefreshAppointment();
        }
      } catch (error) {
        console.error('Error polling follow-up status:', error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [appointmentId, followUpPaymentStatus, onRefreshAppointment]);

  useEffect(() => {
    if (followUpPaymentStatus !== 'PENDING_PAYMENT' || !pendingPaymentCancelAt) {
      setPendingPaymentCountdown(0);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.floor((pendingPaymentCancelAt - Date.now()) / 1000));
      setPendingPaymentCountdown(remaining);
      if (remaining <= 0) return;
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [followUpPaymentStatus, pendingPaymentCancelAt]);

  return {
    followUpSelectedDate,
    followUpCalendarMonth,
    followUpCalendarDayMap,
    followUpSlots,
    loadingFollowUpSlots,
    loadingFollowUpCalendar,
    selectedFollowUpDateTime,
    savingFollowUp,
    followUpAction,
    followUpNotes,
    followUpConsultationType,
    selectedScheduleLabel,
    hasExistingFollowUp,
    handleFollowUpDateChange,
    handleFollowUpMonthChange,
    handleSelectFollowUpSlot,
    handleConfirmFollowUp,
    setFollowUpNotes,
    setFollowUpConsultationType,
    saveFollowUp: savePendingFollowUp,
    followUpPaymentStatus,
    sendingPaymentRequest,
    handleSendPaymentRequest,
    setFollowUpPaymentStatus,
    showRescheduleConfirm,
    isRescheduling,
    handleInitiateReschedule,
    handleConfirmRescheduleModal,
    handleCancelRescheduleModal,
    handleSaveReschedule,
    handleCancelReschedule,
    pendingPaymentCountdown,
    canCancelPendingPayment: pendingPaymentCountdown <= 0 && followUpPaymentStatus === 'PENDING_PAYMENT',
    cancelingPaymentRequest,
    handleCancelPendingPayment,
  };
}
