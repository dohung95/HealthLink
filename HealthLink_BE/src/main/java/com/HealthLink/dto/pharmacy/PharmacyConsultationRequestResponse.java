package com.HealthLink.dto.pharmacy;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class PharmacyConsultationRequestResponse {
    private Integer requestId;
    private String patientId;
    private String patientName;
    private String pharmacyId;
    private String pharmacyName;
    private String symptoms;
    private String description;
    private String allergies;
    private List<String> attachments;
    private String additionalNotes;
    private String preferredDeliveryType;
    private String status;
    private String pharmacyNotes;
    private String patientFollowUpNotes;
    private Integer prescriptionHeaderId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
