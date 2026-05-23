package com.HealthLink.dto.pharmacy;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class PharmacyPrescriptionRequest {
    private String diagnosis;
    private String notes;
    private LocalDateTime validUntil;

    @NotEmpty(message = "Prescription must have at least 1 medication")
    @Valid
    private List<PharmacyPrescriptionItemRequest> items;
}
