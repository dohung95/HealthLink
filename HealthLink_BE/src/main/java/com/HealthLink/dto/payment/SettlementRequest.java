package com.HealthLink.dto.payment;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Request DTO dùng để tiếp nhận yêu cầu rút tiền từ đối tác (Bác sĩ / Nhà thuốc).
 *
 * <ul>
 *   <li>{@code amount}     – Số tiền yêu cầu rút (USD), tối thiểu $10.00</li>
 *   <li>{@code paypalEmail}– Xác nhận lại email PayPal nhận tiền của đối tác</li>
 *   <li>{@code notes}      – Ghi chú tùy chọn kèm theo yêu cầu</li>
 * </ul>
 *
 * <p>Hệ thống sẽ kiểm tra {@code amount} ≤ {@code pendingSettlement} trước khi xử lý.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SettlementRequest {

    /**
     * Số tiền yêu cầu rút (USD).
     * Phải lớn hơn 0 và tối thiểu $10.00.
     */
    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Withdrawal amount must be greater than $0.00")
    private BigDecimal amount;

    /**
     * Email PayPal để nhận tiền (xác nhận lại với email đã đăng ký).
     */
    @NotNull(message = "PayPal email is required")
    @Email(message = "PayPal email must be a valid email address")
    private String paypalEmail;

    /**
     * Ghi chú hoặc lý do rút tiền (tùy chọn, tối đa 500 ký tự).
     */
    private String notes;
}
