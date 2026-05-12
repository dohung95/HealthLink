package com.HealthLink.service.impl.payment;

import com.HealthLink.dto.payment.AdminRevenueReportResponse;
import com.HealthLink.dto.payment.CommissionTransactionResponse;
import com.HealthLink.entity.CommissionTransaction;
import com.HealthLink.repository.payment.CommissionTransactionRepository;
import com.HealthLink.service.payment.AdminReportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Cài đặt của {@link AdminReportService}.
 *
 * <p>Tổng hợp PlatformFee (commissionAmount) theo khoảng thời gian từ bảng CommissionTransactions.
 * Phục vụ Admin giám sát doanh thu hệ thống theo ngày/tháng/năm.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminReportServiceImpl implements AdminReportService {

    // ── Hằng loại nguồn để phân loại commission ────────────────────────────
    private static final String SOURCE_APPOINTMENT = "APPOINTMENT";
    private static final String SOURCE_ORDER       = "PHARMACY_ORDER";

    private final CommissionTransactionRepository commissionTransactionRepository;

    // ========================================================================
    // Báo cáo theo Ngày
    // ========================================================================

    @Override
    @Transactional(readOnly = true)
    public AdminRevenueReportResponse getDailyReport(LocalDateTime date) {
        // Khoảng thời gian: đầu ngày → cuối ngày
        LocalDateTime from = date.toLocalDate().atStartOfDay();
        LocalDateTime to   = date.toLocalDate().atTime(23, 59, 59);
        log.info("Admin daily report: {} to {}", from, to);
        return buildReport(from, to, false);
    }

    // ========================================================================
    // Báo cáo theo Tháng
    // ========================================================================

    @Override
    @Transactional(readOnly = true)
    public AdminRevenueReportResponse getMonthlyReport(int year, int month) {
        YearMonth ym = YearMonth.of(year, month);
        LocalDateTime from = ym.atDay(1).atStartOfDay();
        LocalDateTime to   = ym.atEndOfMonth().atTime(23, 59, 59);
        log.info("Admin monthly report: {} to {}", from, to);
        return buildReport(from, to, false);
    }

    // ========================================================================
    // Báo cáo theo Năm
    // ========================================================================

    @Override
    @Transactional(readOnly = true)
    public AdminRevenueReportResponse getYearlyReport(int year) {
        LocalDateTime from = LocalDateTime.of(year, 1, 1, 0, 0, 0);
        LocalDateTime to   = LocalDateTime.of(year, 12, 31, 23, 59, 59);
        log.info("Admin yearly report: {} to {}", from, to);
        return buildReport(from, to, false);
    }

    // ========================================================================
    // Báo cáo khoảng thời gian tùy chọn
    // ========================================================================

    @Override
    @Transactional(readOnly = true)
    public AdminRevenueReportResponse getCustomRangeReport(
            LocalDateTime from, LocalDateTime to, boolean includeDetails) {
        log.info("Admin custom range report: {} to {}, includeDetails={}", from, to, includeDetails);
        return buildReport(from, to, includeDetails);
    }

    // ========================================================================
    // Private helpers
    // ========================================================================

    /**
     * Xây dựng báo cáo tổng hợp cho khoảng thời gian đã cho.
     * Phân chia commission thành 2 nhóm: Doctor (tư vấn) và Pharmacy (đơn thuốc).
     *
     * @param from           thời điểm bắt đầu
     * @param to             thời điểm kết thúc
     * @param includeDetails true nếu muốn kèm chi tiết từng giao dịch trong response
     */
    private AdminRevenueReportResponse buildReport(
            LocalDateTime from, LocalDateTime to, boolean includeDetails) {

        // Lấy danh sách giao dịch trong kỳ
        List<CommissionTransaction> transactions =
                commissionTransactionRepository.findByDateRange(from, to);

        // Phân loại và tính tổng theo nguồn
        BigDecimal totalDoctorCommission = transactions.stream()
                .filter(t -> SOURCE_APPOINTMENT.equals(t.getSourceType()))
                .filter(t -> !"REFUNDED".equals(t.getStatus()))
                .map(CommissionTransaction::getCommissionAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalPharmacyCommission = transactions.stream()
                .filter(t -> SOURCE_ORDER.equals(t.getSourceType()))
                .filter(t -> !"REFUNDED".equals(t.getStatus()))
                .map(CommissionTransaction::getCommissionAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalPlatformRevenue = totalDoctorCommission.add(totalPharmacyCommission);
        long transactionCount = transactions.stream()
                .filter(t -> !"REFUNDED".equals(t.getStatus()))
                .count();

        // Kèm chi tiết nếu được yêu cầu
        List<CommissionTransactionResponse> details = null;
        if (includeDetails) {
            details = transactions.stream()
                    .map(this::toResponse)
                    .collect(Collectors.toList());
        }

        log.info("Report [{} – {}]: doctorCommission={}, pharmacyCommission={}, total={}, count={}",
                from, to, totalDoctorCommission, totalPharmacyCommission,
                totalPlatformRevenue, transactionCount);

        return AdminRevenueReportResponse.builder()
                .periodStart(from)
                .periodEnd(to)
                .totalDoctorCommission(totalDoctorCommission)
                .totalPharmacyCommission(totalPharmacyCommission)
                .totalPlatformRevenue(totalPlatformRevenue)
                .transactionCount(transactionCount)
                .transactions(details)
                .build();
    }

    /** Ánh xạ CommissionTransaction entity → CommissionTransactionResponse DTO. */
    private CommissionTransactionResponse toResponse(CommissionTransaction tx) {
        return CommissionTransactionResponse.builder()
                .transactionId(tx.getTransactionId())
                .transactionNumber(tx.getTransactionNumber())
                .sourceType(tx.getSourceType())
                .appointmentId(tx.getAppointmentId())
                .pharmacyOrderId(tx.getPharmacyOrderId())
                .recipientType(tx.getRecipientType())
                .recipientId(tx.getRecipientId())
                .recipientName(tx.getRecipientName())
                .serviceType(tx.getServiceType())
                .grossAmount(tx.getGrossAmount())
                .commissionRate(tx.getCommissionRate())
                .commissionAmount(tx.getCommissionAmount())
                .netAmount(tx.getNetAmount())
                .status(tx.getStatus())
                .createdAt(tx.getCreatedAt())
                .build();
    }
}
