package com.HealthLink.dto.pharmacy;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PharmacyInventoryResponse {
    private Integer inventoryId;
    private String pharmacyId;
    private String pharmacyName;
    private Integer medicineId;
    private String medicineName;
    private String genericName;
    private String dosageForm;
    private String strength;
    private String unit;
    private Integer quantity;
    private Integer reservedQuantity;
    private Integer availableQuantity;
    private LocalDate expiryDate;
    private Boolean active;
    private Integer minStockLevel;
    private BigDecimal price;
    private boolean expiringSoon;
    private LocalDateTime lastImportedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
