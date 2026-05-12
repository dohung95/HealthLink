package com.HealthLink.service.payment;

import com.HealthLink.dto.payment.AdminRevenueReportResponse;

import java.time.LocalDateTime;

/**
 * AdminReportService – service truy vấn tổng hợp phục vụ Admin giám sát doanh thu hệ thống.
 *
 * <p>Cung cấp số liệu PlatformFee (tổng commission thu được) theo các khoảng thời gian khác nhau:
 * ngày, tháng, năm, hoặc khoảng thời gian tùy chọn.
 */
public interface AdminReportService {

    /**
     * Báo cáo doanh thu theo ngày cụ thể.
     *
     * @param date ngày cần báo cáo (mặc định: hôm nay)
     * @return tổng hợp PlatformFee trong ngày đó
     */
    AdminRevenueReportResponse getDailyReport(LocalDateTime date);

    /**
     * Báo cáo doanh thu theo tháng và năm.
     *
     * @param year  năm (ví dụ: 2026)
     * @param month tháng (1–12)
     * @return tổng hợp PlatformFee trong tháng đó
     */
    AdminRevenueReportResponse getMonthlyReport(int year, int month);

    /**
     * Báo cáo doanh thu theo năm.
     *
     * @param year năm cần báo cáo
     * @return tổng hợp PlatformFee trong năm đó
     */
    AdminRevenueReportResponse getYearlyReport(int year);

    /**
     * Báo cáo doanh thu theo khoảng thời gian tùy chọn.
     *
     * @param from thời điểm bắt đầu
     * @param to   thời điểm kết thúc
     * @param includeDetails true nếu muốn kèm chi tiết từng giao dịch
     * @return tổng hợp PlatformFee trong khoảng thời gian đó
     */
    AdminRevenueReportResponse getCustomRangeReport(
            LocalDateTime from, LocalDateTime to, boolean includeDetails);
}
