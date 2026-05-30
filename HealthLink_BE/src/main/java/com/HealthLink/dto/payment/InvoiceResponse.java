package com.HealthLink.dto.payment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO được sử dụng khi trả về chi tiết hóa đơn + trạng thái thanh toán cho client.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvoiceResponse {

    private Integer invoiceId;
    private String invoiceNumber;
    private Integer appointmentId;
    private Integer pharmacyOrderId;
    private String patientId;

    // --- Chi tiết chi phí ---
    private BigDecimal consultationFee;
    private BigDecimal medicineFee;
    private BigDecimal deliveryFee;
    private BigDecimal discount;
    private BigDecimal tax;

    /** Tổng số tiền phải thanh toán */
    private BigDecimal amount;

    // --- Trạng thái & ngày ---
    private String status;
    private LocalDateTime issueDate;
    private LocalDateTime dueDate;
    private LocalDateTime paidAt;

    private String notes;

    // --- Thông tin chiết khấu (CHỈ hiển thị cho Doctor/Admin, KHÔNG trả về cho Patient) ---
    /** Phí nền tảng đã khấu trừ (USD) */
    private BigDecimal platformFee;

    /** Số tiền Bác sĩ thực nhận sau chiết khấu (USD) */
    private BigDecimal doctorEarning;

    /** Tỷ lệ chiết khấu đã áp dụng cho hóa đơn này (ví dụ: 0.1500 = 15%) */
    private BigDecimal commissionRate;

    /** Tổng hợp các khoản thanh toán riêng lẻ liên kết với hóa đơn này */
    private List<PaymentSummary> payments;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PaymentSummary {
        private Integer paymentId;
        private BigDecimal amount;
        private String paymentMethod;
        private String paymentGateway;
        private String transactionId;
        private String status;
        private LocalDateTime paidAt;
    }
}
