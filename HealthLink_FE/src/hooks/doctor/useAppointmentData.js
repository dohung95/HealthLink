import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { appointmentService } from '@api/appointmentApi';
import { prescriptionService } from '@api/prescriptionApi';
import { buildConsultation } from '@utils/doctor/tabHelpers';

export function useAppointmentData(appointmentId, patientId, doctorId) {
  const [appointmentDetail, setAppointmentDetail] = useState(null);
  const [loadingAppointment, setLoadingAppointment] = useState(false);
  const [prescription, setPrescription] = useState(null);
  const [loadingPrescription, setLoadingPrescription] = useState(false);
  const [medicalHistory, setMedicalHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedHistoryAppointment, setSelectedHistoryAppointment] = useState(null);
  const [loadingHistorySnapshot, setLoadingHistorySnapshot] = useState(false);

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

  const handleViewAppointmentDetail = useCallback(async (targetAppointmentId) => {
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
  }, [fetchAppointmentBundle]);

  return {
    appointmentDetail,
    loadingAppointment,
    prescription,
    loadingPrescription,
    medicalHistory,
    loadingHistory,
    selectedHistoryAppointment,
    loadingHistorySnapshot,
    handleViewAppointmentDetail,
    refreshAppointmentData,
  };
}
