package com.HealthLink.controller.payment;

import com.HealthLink.dto.payment.AdminRevenueReportResponse;
import com.HealthLink.service.payment.AdminReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

/**
 * REST controller cho các endpoint báo cáo doanh thu Admin.
 *
 * <p>Đường dẫn gốc: /api/admin/reports
 *
 * <p>Phục vụ REQ-12: Admin giám sát tổng PlatformFee theo ngày/tháng/năm
 * dựa trên dữ liệu CommissionTransactions đã hoàn tất.
 *
 * <p>Các endpoint:
 * <ul>
 *   <li>GET /api/admin/reports/daily            – Báo cáo ngày (mặc định: hôm nay)</li>
 *   <li>GET /api/admin/reports/monthly           – Báo cáo tháng</li>
 *   <li>GET /api/admin/reports/yearly            – Báo cáo năm</li>
 *   <li>GET /api/admin/reports/custom            – Báo cáo khoảng thời gian tùy chọn</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/admin/reports")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminReportController {

    private final AdminReportService adminReportService;

    // ──────────────────────────────────────────────────────────────────────
    // Báo cáo theo ngày
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Lấy báo cáo doanh thu PlatformFee trong một ngày cụ thể.
     * Nếu không truyền tham số {@code date}, mặc định dùng ngày hiện tại.
     *
     * GET /api/admin/reports/daily?date=2026-05-10T00:00:00
     */
    @GetMapping("/daily")
    public ResponseEntity<AdminRevenueReportResponse> getDailyReport(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime date) {
        // Mặc định: hôm nay nếu không có tham số
        LocalDateTime reportDate = (date != null) ? date : LocalDateTime.now();
        return ResponseEntity.ok(adminReportService.getDailyReport(reportDate));
    }

    // ──────────────────────────────────────────────────────────────────────
    // Báo cáo theo tháng
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Lấy báo cáo doanh thu PlatformFee trong một tháng cụ thể.
     *
     * GET /api/admin/reports/monthly?year=2026&month=5
     */
    @GetMapping("/monthly")
    public ResponseEntity<AdminRevenueReportResponse> getMonthlyReport(
            @RequestParam int year,
            @RequestParam int month) {
        return ResponseEntity.ok(adminReportService.getMonthlyReport(year, month));
    }

    // ──────────────────────────────────────────────────────────────────────
    // Báo cáo theo năm
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Lấy báo cáo doanh thu PlatformFee trong một năm cụ thể.
     *
     * GET /api/admin/reports/yearly?year=2026
     */
    @GetMapping("/yearly")
    public ResponseEntity<AdminRevenueReportResponse> getYearlyReport(
            @RequestParam int year) {
        return ResponseEntity.ok(adminReportService.getYearlyReport(year));
    }

    // ──────────────────────────────────────────────────────────────────────
    // Báo cáo khoảng thời gian tùy chọn
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Lấy báo cáo doanh thu PlatformFee theo khoảng thời gian tùy chọn.
     * Hỗ trợ kèm chi tiết từng giao dịch khi {@code includeDetails=true}.
     *
     * GET /api/admin/reports/custom?from=2026-05-01T00:00:00&to=2026-05-10T23:59:59&includeDetails=true
     */
    @GetMapping("/custom")
    public ResponseEntity<AdminRevenueReportResponse> getCustomRangeReport(
            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime from,

            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime to,

            @RequestParam(defaultValue = "false")
            boolean includeDetails) {
        return ResponseEntity.ok(adminReportService.getCustomRangeReport(from, to, includeDetails));
    }
}
