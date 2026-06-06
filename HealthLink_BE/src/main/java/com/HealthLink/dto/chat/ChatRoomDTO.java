package com.HealthLink.dto.chat;

import lombok.*;

import java.time.LocalDateTime;

/**
 * DTO trả về thông tin phòng chat cho client.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatRoomDTO {

    private String chatRoomId;

    private String user1Id;
    private String user1DisplayName;
    private String user1PhotoURL;
    private String user1Specialty;

    private String user2Id;
    private String user2DisplayName;
    private String user2PhotoURL;
    private String user2Specialty;

    /** Nội dung tin nhắn cuối cùng trong phòng. */
    private String lastMessage;

    /** Thời điểm tin nhắn cuối được gửi. */
    private LocalDateTime lastMessageAt;

    /** ID cuộc hẹn (appointment) liên kết, nếu có. */
    private Integer appointmentId;

    /** Số lượng tin nhắn chưa đọc của người dùng hiện tại (tuỳ chọn, tính ở service). */
    private long unreadCount;
}
