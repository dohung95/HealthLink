import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Hook xử lý hai hành động chính trong trang chi tiết cuộc hẹn (doctor side):
 *  - handleChat: Mở chat với bệnh nhân thông qua REST API (backend)
 *  - handleVideoCall: Khởi tạo cuộc gọi video với bệnh nhân
 *
 * Lưu ý: Chat được xử lý qua backend REST (không phải Firebase Firestore).
 * Flow: Điều hướng đến trang ChatPage và truyền state partnerId.
 */
export function useChatVideo({ appointment, doctorId, patientId, patient, roles, openChatWith, initiateCall }) {
  const navigate = useNavigate();

  /**
   * Mở chat với bệnh nhân.
   *
   * Lấy userId của bệnh nhân từ appointment → điều hướng đến `/doctor/chat` với state.
   * ChatPage.jsx sẽ bắt state này và tự động lấy/tạo phòng chat qua API backend.
   */
  const handleChat = useCallback(async () => {
    // Lấy partnerId (userId của patient) từ nhiều nguồn có thể có
    const partnerId = appointment?.patient?.patientId
      || appointment?.patient?.patientID
      || appointment?.patientId
      || appointment?.patientID
      || patientId;

    const partnerName = appointment?.patient?.fullName || patient?.fullName || 'Patient';

    // Log để debug khi cần
    console.log('[Chat] Attempting to open chat. appointment:', appointment);
    console.log('[Chat] Resolved partnerId:', partnerId);

    if (!partnerId) {
      // Không tìm được ID của bệnh nhân — hiển thị cảnh báo
      alert('Chat partner information is missing. Please try again or refresh the page.');
      return;
    }

    // Chat popup (Chat.jsx) bị ẩn trên trang Doctor, nên ta phải chuyển hướng đến ChatPage (/doctor/chat)
    navigate('/doctor/chat', { 
      state: { 
        partnerId: partnerId,
        partnerName: partnerName,
        appointmentId: appointment?.appointmentId
      } 
    });
  }, [appointment, patientId, patient, navigate]);

  /**
   * Khởi tạo cuộc gọi video với bệnh nhân.
   * Tạo một roomId ngẫu nhiên 45 ký tự và gọi initiateCall.
   */
  const handleVideoCall = useCallback(async () => {
    try {
      const resolvedPatientId = appointment?.patient?.patientId
        || appointment?.patient?.patientID
        || appointment?.patientId
        || patientId;
      const resolvedDoctorId = doctorId;
      const patientName = appointment?.patient?.fullName || patient?.fullName || 'Patient';
      const doctorName = appointment?.doctor?.fullName || 'Doctor';

      // Xác định ai là "target" để call đến: bác sĩ → gọi cho bệnh nhân và ngược lại
      const isDoctor = roles && roles.some((role) => String(role).trim().toLowerCase() === 'doctor');
      const targetUserId = isDoctor ? resolvedPatientId : resolvedDoctorId;
      const targetUserName = isDoctor ? patientName : doctorName;

      // Tạo roomId ngẫu nhiên 45 ký tự (dùng cho WebRTC signaling)
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

