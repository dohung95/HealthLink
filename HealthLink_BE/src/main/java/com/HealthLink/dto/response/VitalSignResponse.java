package com.HealthLink.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class VitalSignResponse {
    private Integer vitalSignId;

    private String patientId;
    private Integer appointmentId;

    private Integer heartRate;
    private Integer bloodPressureSystolic;
    private Integer bloodPressureDiastolic;
    private Double temperature;
    private Integer oxygenSaturation;
    private Integer respiratoryRate;

    private String source;
    private String deviceName;
    private String notes;

    private LocalDateTime measuredAt;
    private LocalDateTime createdAt;
}