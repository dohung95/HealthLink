package com.HealthLink.dto.payment;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Request/Response DTO để Admin cập nhật cấu hình tỷ lệ chiết khấu
 * cho từng loại dịch vụ trong hệ thống HealthLink.
 *
 * <p>Ánh xạ trực tiếp tới entity {@code CommissionConfig}.
 *
 * <ul>
 *   <li>{@code serviceType}    – Loại dịch vụ: ONLINE, OFFLINE, PHARMACY_ORDER</li>
 *   <li>{@code commissionRate} – Tỷ lệ chiết khấu (0.0000–1.0000), ví dụ 0.1500 = 15%</li>
 *   <li>{@code minCommission}  – Số tiền chiết khấu tối thiểu mỗi giao dịch (USD)</li>
 *   <li>{@code description}    – Mô tả/ghi chú về cấu hình này</li>
 * </ul>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommissionConfigDTO {

    /**
     * Loại dịch vụ áp dụng chiết khấu.
     * Giá trị hợp lệ: {@code ONLINE}, {@code OFFLINE}, {@code PHARMACY_ORDER}
     */
    @NotBlank(message = "Service type is required")
    private String serviceType;

    /**
     * Tỷ lệ chiết khấu platform (0.0000 – 1.0000).
     * Ví dụ: 0.1500 tương đương 15%.
     */
    @NotNull(message = "Commission rate is required")
    @DecimalMin(value = "0.0000", message = "Commission rate must be >= 0")
    @DecimalMax(value = "1.0000", message = "Commission rate must be <= 1 (100%)")
    private BigDecimal commissionRate;

    /**
     * Số tiền chiết khấu tối thiểu mỗi giao dịch (USD).
     * Phải > 0 nếu được cung cấp.
     */
    @Positive(message = "Minimum commission must be a positive value")
    private BigDecimal minCommission;

    /**
     * Mô tả hoặc ghi chú bổ sung về cấu hình này.
     */
    private String description;
}
