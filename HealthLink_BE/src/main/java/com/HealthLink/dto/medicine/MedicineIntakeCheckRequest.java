package com.HealthLink.dto.medicine;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class MedicineIntakeCheckRequest {
    @NotNull
    private Integer prescriptionItemId;

    @NotBlank
    private String timing;

    @NotNull
    private LocalDate intakeDate;

    @NotNull
    private Boolean checked;
}
