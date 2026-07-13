package com.HealthLink.dto.pharmacy;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class PharmacyDeliveryContactChangeReviewRequest {
    @NotBlank
    private String status; // APPROVED or REJECTED
    private String pharmacyReviewNotes;
    private BigDecimal deliveryFee;
    private LocalDateTime estimatedDeliveryTime;

    @Min(value = 1, message = "Estimated delivery minutes must be >= 1")
    @Max(value = 999, message = "Estimated delivery minutes must be <= 999")
    private Integer estimatedDeliveryMinutes;
}
