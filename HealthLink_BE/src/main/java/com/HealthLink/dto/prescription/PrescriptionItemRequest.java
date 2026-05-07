package com.HealthLink.dto.prescription;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class PrescriptionItemRequest {

    @NotNull(message = "MedicineId is required")
    private Integer medicineId;

    @NotNull(message = "Total supply days is required")
    @Min(value = 1, message = "Total supply days must be >= 1")
    private Integer totalSupplyDays;

    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be >= 1")
    private Integer quantity;

    private String unit;        // viên, gói, chai...
    private String frequency;   // 1 lần/ngày, 2 lần/ngày...
    private String timing;      // trước ăn, sau ăn...
    private String route;       // uống, tiêm, bôi...

    private BigDecimal unitPrice;  // đơn giá (override giá thuốc nếu cần)
    private String notes;
}
