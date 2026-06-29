package com.HealthLink.dto.consultation;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class FollowUpStatusResponse {
    private String status;
    private LocalDateTime followUpDate;
    private String followUpNotes;
    private String consultationType;
    private Integer followUpAppointmentId;
}
