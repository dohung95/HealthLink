package com.HealthLink.dto.medicine;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class MedicineReminderItemResponse {
    private Integer prescriptionItemId;
    private String medicationName;
    private String dosage;
    private Integer quantity;
    private String unit;
    private String instructions;
    private String notes;
    private Boolean checked;
    private LocalDateTime checkedAt;
}
