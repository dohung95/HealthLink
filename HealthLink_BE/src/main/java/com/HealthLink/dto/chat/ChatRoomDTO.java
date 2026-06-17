package com.HealthLink.dto.chat;

import lombok.*;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDateTime;

/**
 * DTO trả về thông tin phòng chat cho client (web/mobile).
 *
 * <p>Bao gồm thông tin 2 người dùng trong phòng, nội dung tin nhắn cuối,
 * liên kết cuộc hẹn (nếu có) và trạng thái cuộc hẹn để client biết khi nào
 * cần khóa giao diện chat (không cho gửi tin nữa).</p>
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

    /** ID cuộc hẹn (appointment) liên kết với phòng chat này (nếu có). */
    private Integer appointmentId;

    /**
     * Trạng thái của cuộc hẹn liên kết (nếu có).
     * Ví dụ: "SCHEDULED", "IN_CONSULTATION", "COMPLETED", "CANCELLED".
     *
     * <p>Client sử dụng trường này để quyết định có khóa chat hay không:
     * nếu status là "COMPLETED", chat chỉ được xem, không được gửi tin mới.</p>
     */
    private String appointmentStatus;

    /** ID của người dùng đã block phòng chat này (nếu có). */
    private String blockedBy;

    /** Số lượng tin nhắn chưa đọc của người dùng hiện tại (tuỳ chọn, tính ở service). */
    private long unreadCount;

    /** Trạng thái online của đối tác chat. */
    @JsonProperty("isOnline")
    private boolean isOnline;
}
