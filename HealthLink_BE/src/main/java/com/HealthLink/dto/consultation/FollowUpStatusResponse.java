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
    private Double homeVisitLatitude;
    private Double homeVisitLongitude;
    private String doctorId;
    private Integer consultationId;
    private Integer sourceAppointmentId;
    private String sourceAppointmentType;
    private String patientId;
    private Boolean hasSourceHomeVisitDetails;
    private FollowUpHomeVisitDetailsDto sourceHomeVisitDetails;
}
