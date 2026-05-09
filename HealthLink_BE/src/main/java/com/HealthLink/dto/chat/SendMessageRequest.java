package com.HealthLink.dto.chat;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

/**
 * Request body khi client gửi một tin nhắn mới.
 * senderId KHÔNG được truyền từ client — sẽ lấy tự động từ JWT token.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SendMessageRequest {

    @NotBlank(message = "chatRoomId is required")
    private String chatRoomId;

    @NotBlank(message = "receiverId is required")
    private String receiverId;

    /** Nội dung văn bản. Có thể null nếu chỉ gửi ảnh. */
    private String content;

    /** URL ảnh đính kèm (tuỳ chọn). */
    private String imageUrl;
}
