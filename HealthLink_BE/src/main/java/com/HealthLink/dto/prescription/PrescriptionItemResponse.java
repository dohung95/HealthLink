package com.HealthLink.dto.prescription;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class PrescriptionItemResponse {
    private Integer prescriptionItemId;
    private Integer medicineId;
    private String medicationName;
    private String dosage;
    private String instructions;
    private Integer totalSupplyDays;
    private Integer quantity;
    private String unit;
    private String frequency;
    private String timing;
    private String route;
    private BigDecimal unitPrice;
    private BigDecimal totalPrice;
    private String notes;
}
