package com.HealthLink.dto.consultation;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ConsultationResponse {

    private Integer consultationId;
    private Integer appointmentId;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String diagnosis;
    private String doctorNotes;
    private String treatmentPlan;
    private LocalDateTime followUpDate;
    private String followUpNotes;
}
