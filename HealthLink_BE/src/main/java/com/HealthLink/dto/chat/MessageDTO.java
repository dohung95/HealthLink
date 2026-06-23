package com.HealthLink.dto.chat;

import lombok.*;

import java.time.LocalDateTime;

/**
 * DTO trả về thông tin một tin nhắn trong phòng chat.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MessageDTO {

    private String messageId;

    private String chatRoomId;

    private String senderId;
    private String senderDisplayName;
    private String senderPhotoURL;

    private String receiverId;

    /** Nội dung văn bản của tin nhắn. */
    private String content;

    /** URL ảnh đính kèm (nếu có). */
    private String imageUrl;

    private String videoUrl;
    private String fileUrl;
    private String audioUrl;

    /** Đã đọc hay chưa. */
    private boolean read;

    /** Thời điểm gửi. */
    private LocalDateTime timestamp;
}
    