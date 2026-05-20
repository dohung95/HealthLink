package com.HealthLink.dto.pharmacy;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class PharmacyPrescriptionItemRequest {

    @NotNull(message = "Medicine ID is required")
    private Integer medicineId;

    @NotNull(message = "Total supply days is required")
    @Min(value = 1, message = "Total supply days must be >= 1")
    private Integer totalSupplyDays;

    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be >= 1")
    private Integer quantity;

    private String unit;
    private String frequency;

    @NotBlank(message = "Timing is required")
    private String timing;

    private String route;
    private BigDecimal unitPrice;
    private String notes;
}
