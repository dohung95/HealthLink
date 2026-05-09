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

    @NotBlank(message = "user1Id is required")
    private String user1Id;

    @NotBlank(message = "user2Id is required")
    private String user2Id;

    /** ID cuộc hẹn liên kết (optional). */
    private Integer appointmentId;
}
