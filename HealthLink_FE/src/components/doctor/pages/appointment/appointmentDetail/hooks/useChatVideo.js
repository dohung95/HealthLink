import { useCallback } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../../../../firebase';

export function useChatVideo({ appointment, doctorId, patientId, patient, roles, openChatWith, initiateCall }) {
  const handleChat = useCallback(async () => {
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
  }, [appointment, patientId, openChatWith]);

  const handleVideoCall = useCallback(async () => {
    try {
      const resolvedPatientId = appointment?.patient?.patientId || appointment?.patientId || patientId;
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
    } catch (error) {
      console.error('Error initiating video call:', error);
      alert('Unable to start video call.');
    }
  }, [appointment, doctorId, patientId, patient, roles, initiateCall]);

  return { handleChat, handleVideoCall };
}
