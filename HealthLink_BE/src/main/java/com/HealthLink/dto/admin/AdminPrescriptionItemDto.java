package com.HealthLink.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminPrescriptionItemDto {
    private Integer prescriptionItemID;
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
