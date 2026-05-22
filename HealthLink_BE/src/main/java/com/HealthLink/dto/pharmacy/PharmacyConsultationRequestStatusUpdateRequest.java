package com.HealthLink.dto.pharmacy;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PharmacyConsultationRequestStatusUpdateRequest {

    @NotBlank(message = "Status is required")
    private String status;

    private String pharmacyNotes;
    private String patientFollowUpNotes;
}
