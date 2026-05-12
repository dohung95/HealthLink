package com.HealthLink.dto.payment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * DTO trả về chi tiết một lần rút tiền (Settlement) cho đối tác.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SettlementResponse {

    private Integer settlementId;
    private String settlementNumber;

    /** Loại đối tác nhận tiền: DOCTOR hoặc PHARMACY */
    private String recipientType;
    private String recipientId;
    private String recipientName;

    /** Tổng doanh thu gốc trong kỳ (USD) */
    private BigDecimal grossAmount;

    /** Tổng phí nền tảng đã khấu trừ (USD) */
    private BigDecimal commissionAmount;

    /** Số tiền thực chuyển về cho đối tác (USD) */
    private BigDecimal netAmount;

    /** Trạng thái: PENDING, PROCESSING, COMPLETED, FAILED */
    private String status;

    /** Phương thức nhận tiền: PAYPAL */
    private String paymentMethod;

    /** Email PayPal nhận tiền */
    private String paypalEmail;

    private LocalDateTime periodStart;
    private LocalDateTime periodEnd;
    private LocalDateTime processedAt;
    private LocalDateTime completedAt;

    /** Ghi chú hoặc lý do thất bại */
    private String notes;

    private LocalDateTime createdAt;
}
