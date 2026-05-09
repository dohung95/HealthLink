package com.HealthLink.dto.registration;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApproveRejectRequest {
    @NotBlank(message = "Action is required")
    private String action; // APPROVE or REJECT

    private String rejectionReason; // Required if action is REJECT
}
