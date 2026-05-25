package com.HealthLink.dto.prescription;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class PrescriptionItemRequest {

    @NotNull(message = "MedicineId is required")
    private Integer medicineId;

    @NotNull(message = "Total supply days is required")
    @Min(value = 1, message = "Total supply days must be >= 1")
    private Integer totalSupplyDays;

    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be >= 1")
    private Integer quantity;

    private String unit;
    private String frequency;

    private String timing;

    private List<String> timings;

    private String route;
    private BigDecimal unitPrice;
    private String notes;
}
