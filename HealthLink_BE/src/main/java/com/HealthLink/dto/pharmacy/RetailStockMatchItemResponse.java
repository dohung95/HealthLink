package com.HealthLink.dto.pharmacy;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RetailStockMatchItemResponse {

    private Integer medicineId;
    private String medicineName;
    private Integer requiredQuantity;
    private Integer availableQuantity;
    private Boolean matched;
    private String reason;
    private BigDecimal lineTotal;
}
