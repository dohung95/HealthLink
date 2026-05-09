package com.HealthLink.dto.prescription;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class PrescriptionRequest {

    @NotNull(message = "AppointmentId is required")
    private Integer appointmentId;

    private String diagnosis;
    private String notes;
    private LocalDateTime validUntil;

    @NotEmpty(message = "Prescription must have at least 1 medication")
    @Valid
    private List<PrescriptionItemRequest> items;
}
