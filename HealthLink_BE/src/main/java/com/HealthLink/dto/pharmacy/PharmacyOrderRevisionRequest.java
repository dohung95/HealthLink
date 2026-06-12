package com.HealthLink.dto.pharmacy;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PharmacyOrderRevisionRequest {

    @NotBlank(message = "Reason is required")
    private String reason;
}
