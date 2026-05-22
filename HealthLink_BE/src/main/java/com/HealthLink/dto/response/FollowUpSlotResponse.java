package com.HealthLink.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FollowUpSlotResponse {
    private String startTime;
    private String endTime;
    private String status;
    private boolean selectable;
    private Integer appointmentId;
    private Integer consultationId;
    private String label;
    private String disabledReason;
}
