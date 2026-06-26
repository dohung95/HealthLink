import stompChatService from './stompChatService';

/**
 * Service quản lý luồng tín hiệu (Signaling) cho WebRTC Video Call.
 * Sử dụng chung kết nối STOMP của stompChatService.
 */
class VideoCallService {
    
    /**
     * Đăng ký nhận tín hiệu WebRTC realtime.
     * Backend push đến: /user/{userId}/queue/webrtc
     *
     * @param {Function} onMessageCallback - Callback nhận WebRTCSignal
     * @returns {Function} Hàm để huỷ đăng ký (unsubscribe)
     */
    subscribeToWebRTC(onMessageCallback) {
        const destination = '/user/queue/webrtc';
        return stompChatService.subscribeToDestination(destination, onMessageCallback);
    }

    /**
     * Gửi tín hiệu WebRTC đến backend.
     * Backend xử lý tại: /app/webrtc.signal
     * 
     * @param {Object} signal - Đối tượng chứa thông tin tín hiệu (type, senderId, receiverId, data)
     */
    sendWebRTCSignal(signal) {
        const destination = '/app/webrtc.signal';
        stompChatService.publishToDestination(destination, signal);
    }
}

// Singleton — dùng chung toàn app
const videoCallService = new VideoCallService();
export default videoCallService;
