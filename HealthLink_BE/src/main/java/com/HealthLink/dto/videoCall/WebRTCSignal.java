package com.HealthLink.dto.videoCall;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class WebRTCSignal {
    private String type;       // "CALL_REQUEST", "CALL_ACCEPTED", "CALL_DECLINED", "OFFER", "ANSWER", "CANDIDATE", "HANGUP"
    private String senderId;   // ID người gửi (UUID)
    private String senderName; // Tên người gửi (dùng cho CallerName)
    private String senderRole; // PATIENT, DOCTOR, or PHARMACY
    private String receiverId; // ID người nhận (UUID hoặc Email tuỳ cấu hình)
    private String data;       // Nội dung SDP hoặc ICE Candidate (dạng JSON string) hoặc RoomId
}
