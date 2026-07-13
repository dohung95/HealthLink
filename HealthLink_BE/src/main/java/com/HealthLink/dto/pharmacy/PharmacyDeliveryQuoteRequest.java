package com.HealthLink.dto.pharmacy;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class PharmacyDeliveryQuoteRequest {
    @NotNull(message = "Delivery fee is required")
    @DecimalMin(value = "0.00", message = "Delivery fee must be greater than or equal to 0")
    private BigDecimal deliveryFee;

    private LocalDateTime estimatedDeliveryTime;

    @Min(value = 1, message = "Estimated delivery minutes must be >= 1")
    @Max(value = 999, message = "Estimated delivery minutes must be <= 999")
    private Integer estimatedDeliveryMinutes;

    private String pharmacistNotes;
}
