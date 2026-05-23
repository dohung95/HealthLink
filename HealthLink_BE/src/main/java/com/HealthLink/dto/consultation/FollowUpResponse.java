package com.HealthLink.dto.consultation;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class FollowUpResponse {
    private Integer consultationId;
    private Integer appointmentId;
    private Integer followUpAppointmentId;
    private LocalDateTime followUpDate;
    private String followUpNotes;
    private String diagnosis;
    private String doctorNotes;
    private String treatmentPlan;
}
