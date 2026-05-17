package com.HealthLink.dto.chat;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

/**
 * Request body khi client tạo hoặc mở một phòng chat mới.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateRoomRequest {

    /** Tự động lấy từ JWT ở controller – không cần gửi từ client. */
    private String user1Id;

    @NotBlank(message = "user2Id is required")
    private String user2Id;

    /** ID cuộc hẹn liên kết (optional). */
    private Integer appointmentId;
}
