package com.HealthLink.dto.payment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * DTO trả về chi tiết một giao dịch commission.
 * Dùng cho dashboard đối tác và báo cáo Admin.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommissionTransactionResponse {

    private Integer transactionId;
    private String transactionNumber;

    /** Nguồn gốc giao dịch: APPOINTMENT hoặc PHARMACY_ORDER */
    private String sourceType;

    private Integer appointmentId;
    private Integer pharmacyOrderId;

    /** Loại đối tác: DOCTOR hoặc PHARMACY */
    private String recipientType;
    private String recipientId;
    private String recipientName;

    /** Loại dịch vụ: CONSULTATION_ONLINE, CONSULTATION_OFFLINE, PHARMACY_ORDER */
    private String serviceType;

    /** Số tiền gốc trước chiết khấu (USD) */
    private BigDecimal grossAmount;

    /** Tỷ lệ chiết khấu đã áp dụng (snapshot tại thời điểm) */
    private BigDecimal commissionRate;

    /** Số tiền nền tảng giữ lại (USD) */
    private BigDecimal commissionAmount;

    /** Số tiền đối tác thực nhận (USD) */
    private BigDecimal netAmount;

    /** Trạng thái: PENDING, SETTLED, REFUNDED */
    private String status;

    private LocalDateTime createdAt;
}
