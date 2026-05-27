package com.HealthLink.dto.request;

import lombok.Data;

@Data
public class VitalSignRequest {
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
}