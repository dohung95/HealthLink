package com.HealthLink.dto.pharmacy;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PharmacyInventoryRowError {
    private int rowNumber;
    private Integer medicineId;
    private String medicineName;
    private String message;
}
