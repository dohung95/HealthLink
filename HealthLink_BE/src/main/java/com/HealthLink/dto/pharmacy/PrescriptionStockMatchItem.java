package com.HealthLink.dto.pharmacy;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrescriptionStockMatchItem {
    private Integer prescriptionItemId;
    private Integer medicineId;
    private String medicationName;
    private Integer requiredQuantity;
    private Integer availableQuantity;
    private Boolean matched;
    private String reason;
}
