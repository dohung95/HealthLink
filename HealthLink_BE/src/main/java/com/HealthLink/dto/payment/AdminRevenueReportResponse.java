package com.HealthLink.dto.payment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO báo cáo tổng hợp doanh thu nền tảng cho Admin.
 * Tổng hợp PlatformFee theo ngày/tháng/năm hoặc khoảng thời gian tùy chọn.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminRevenueReportResponse {

    /** Thời điểm bắt đầu kỳ báo cáo */
    private LocalDateTime periodStart;

    /** Thời điểm kết thúc kỳ báo cáo */
    private LocalDateTime periodEnd;

    /** Tổng PlatformFee thu được từ tư vấn bác sĩ (USD) */
    private BigDecimal totalDoctorCommission;

    /** Tổng PlatformFee thu được từ đơn thuốc (USD) */
    private BigDecimal totalPharmacyCommission;

    /** Tổng PlatformFee của toàn hệ thống trong kỳ (USD) */
    private BigDecimal totalPlatformRevenue;

    /** Số lượng giao dịch commission trong kỳ */
    private Long transactionCount;

    /** Chi tiết từng giao dịch trong kỳ (tùy chọn, có thể null) */
    private List<CommissionTransactionResponse> transactions;
}
