package com.HealthLink.dto.pharmacy;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class PharmacyInventoryUpdateRequest {
    private Integer quantity;
    private Integer reservedQuantity;
    private BigDecimal unitPrice;
    private String unit;
    private LocalDate expiryDate;
    private Boolean active;
}
