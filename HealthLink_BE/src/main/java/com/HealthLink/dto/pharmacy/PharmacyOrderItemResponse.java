package com.HealthLink.dto.pharmacy;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class PharmacyOrderItemResponse {
    private Integer orderItemId;
    private Integer medicineId;
    private Integer sourcePrescriptionHeaderId;
    private Integer sourcePrescriptionItemId;
    private String medicationName;
    private Integer totalSupplyDays;
    private Integer quantity;
    private String unit;
    private String frequency;
    private String timing;
    private List<String> timings;
    private String route;
    private BigDecimal totalPrice;
    private String notes;
}
