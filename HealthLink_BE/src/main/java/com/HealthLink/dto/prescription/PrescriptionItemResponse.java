package com.HealthLink.dto.prescription;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

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
    private List<String> timings;
    private String route;
    private String notes;
    private BigDecimal unitPrice;
    private BigDecimal totalPrice;
}
