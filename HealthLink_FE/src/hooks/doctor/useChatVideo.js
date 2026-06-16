import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function useChatVideo({ appointment, doctorId, patientId, patient, roles, initiateCall, onError }) {
  const navigate = useNavigate();

  const handleChat = useCallback(async () => {
    const partnerId = appointment?.patient?.patientId
      || appointment?.patient?.patientID
      || appointment?.patientId
      || appointment?.patientID
      || patientId;

    const partnerName = appointment?.patient?.fullName || patient?.fullName || 'Patient';

    if (!partnerId) {
      onError?.('Chat partner information is missing. Please try again or refresh the page.');
      return;
    }

    navigate('/doctor/chat', {
      state: {
        partnerId: partnerId,
        partnerName: partnerName,
        appointmentId: appointment?.appointmentId
      }
    });
  }, [appointment, patientId, patient, navigate, onError]);

  const handleVideoCall = useCallback(async () => {
    try {
      const resolvedPatientId = appointment?.patient?.patientId
        || appointment?.patient?.patientID
        || appointment?.patientId
        || patientId;
      const resolvedDoctorId = doctorId;
      const patientName = appointment?.patient?.fullName || patient?.fullName || 'Patient';
      const doctorName = appointment?.doctor?.fullName || 'Doctor';

      const isDoctor = roles && roles.some((role) => String(role).trim().toLowerCase() === 'doctor');
      const targetUserId = isDoctor ? resolvedPatientId : resolvedDoctorId;
      const targetUserName = isDoctor ? patientName : doctorName;

      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let roomId = '';
      for (let index = 0; index < 45; index += 1) {
        roomId += characters.charAt(Math.floor(Math.random() * characters.length));
      }

      initiateCall(targetUserId, roomId, targetUserName, doctorName);
    } catch {
      onError?.('Unable to start video call.');
    }
  }, [appointment, doctorId, patientId, patient, roles, initiateCall, onError]);

  useEffect(() => {
    return () => {};
  }, []);

  return { handleChat, handleVideoCall };
}
