package com.HealthLink.controller.payment;

import com.HealthLink.dto.payment.AdminRevenueReportResponse;
import com.HealthLink.dto.payment.CommissionConfigDTO;
import com.HealthLink.dto.payment.SettlementResponse;
import com.HealthLink.entity.CommissionConfig;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.repository.payment.PaymentCommissionConfigRepository;
import com.HealthLink.repository.payment.PaymentSettlementRepository;
import com.HealthLink.service.payment.AdminReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * REST Controller dành cho Quản trị viên (Admin) giám sát toàn bộ dòng tiền hệ thống.
 *
 * <p>Đường dẫn gốc: {@code /api/payment/admin}
 *
 * <p>Các endpoint (REQ-12):
 * <ul>
 *   <li>GET   /api/payment/admin/reports/revenue  – Tổng hợp báo cáo doanh thu hệ thống</li>
 *   <li>GET   /api/payment/admin/settlements/all  – Danh sách toàn bộ lệnh rút tiền</li>
 *   <li>PATCH /api/payment/admin/configs          – Cập nhật tỷ lệ chiết khấu theo serviceType</li>
 * </ul>
 *
 * <p>Phân quyền: chỉ dành cho Admin.
 */
@Slf4j
@RestController
@RequestMapping("/api/payment/admin")
@RequiredArgsConstructor
public class AdminPaymentController {

    private final AdminReportService           adminReportService;
    private final PaymentSettlementRepository         settlementRepository;
    private final PaymentCommissionConfigRepository   commissionConfigRepository;

    // ═══════════════════════════════════════════════════════════════════════
    // GET /api/payment/admin/reports/revenue
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Tổng hợp báo cáo doanh thu hệ thống trong khoảng thời gian tùy chọn:
     * <ul>
     *   <li>Tổng doanh thu gốc (grossAmount) – chưa khấu trừ</li>
     *   <li>Tổng phí hệ thống (PlatformFee) thu được</li>
     *   <li>Tổng số tiền đã quyết toán cho đối tác (netAmount)</li>
     * </ul>
     *
     * <p>GET /api/payment/admin/reports/revenue?from=2026-05-01T00:00:00&amp;to=2026-05-31T23:59:59&amp;includeDetails=false
     *
     * @param from           thời điểm bắt đầu kỳ báo cáo (ISO datetime)
     * @param to             thời điểm kết thúc kỳ báo cáo (ISO datetime)
     * @param includeDetails kèm chi tiết từng giao dịch nếu true (mặc định: false)
     * @return {@link AdminRevenueReportResponse} tổng hợp doanh thu
     */
    @GetMapping("/reports/revenue")
    public ResponseEntity<AdminRevenueReportResponse> getRevenueReport(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime from,

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime to,

            @RequestParam(defaultValue = "false")
            boolean includeDetails) {

        // Mặc định: tháng hiện tại nếu không truyền tham số
        LocalDateTime effectiveFrom = (from != null) ? from
                : LocalDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);
        LocalDateTime effectiveTo   = (to != null)   ? to   : LocalDateTime.now();

        log.info("Admin revenue report: from={}, to={}, includeDetails={}",
                effectiveFrom, effectiveTo, includeDetails);

        AdminRevenueReportResponse report =
                adminReportService.getCustomRangeReport(effectiveFrom, effectiveTo, includeDetails);

        return ResponseEntity.ok(report);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // GET /api/payment/admin/settlements/all
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Lấy toàn bộ danh sách lệnh rút tiền trên hệ thống để Admin giám sát
     * trạng thái thanh toán (PENDING, COMPLETED, FAILED).
     * Hỗ trợ lọc theo trạng thái.
     *
     * <p>GET /api/payment/admin/settlements/all?status=PENDING
     *
     * @param status (tùy chọn) lọc theo trạng thái: PENDING | COMPLETED | FAILED
     * @return danh sách {@link SettlementResponse} sắp xếp mới nhất lên đầu
     */
    @GetMapping("/settlements/all")
    @Transactional(readOnly = true)
    public ResponseEntity<List<SettlementResponse>> getAllSettlements(
            @RequestParam(required = false) String status) {

        log.info("Admin get all settlements: statusFilter={}", status);

        List<SettlementResponse> settlements;
        if (status != null && !status.isBlank()) {
            // Lọc theo trạng thái cụ thể
            settlements = settlementRepository
                    .findAll()
                    .stream()
                    .filter(s -> status.equalsIgnoreCase(s.getStatus()))
                    .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                    .map(this::toSettlementResponse)
                    .collect(Collectors.toList());
        } else {
            // Trả về tất cả, sắp xếp mới nhất lên đầu
            settlements = settlementRepository
                    .findAll()
                    .stream()
                    .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                    .map(this::toSettlementResponse)
                    .collect(Collectors.toList());
        }

        log.info("Admin settlements returned: count={}", settlements.size());
        return ResponseEntity.ok(settlements);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PATCH /api/payment/admin/configs
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Cập nhật tỷ lệ chiết khấu cho một loại dịch vụ cụ thể.
     * Ví dụ: Online Consultation 15%, Offline Consultation 8%.
     * Chỉ cập nhật cấu hình đang active ({@code active = true}).
     *
     * <p>PATCH /api/payment/admin/configs
     *
     * <p>Request body – {@link CommissionConfigDTO}:
     * <pre>
     * {
     *   "serviceType": "CONSULTATION_ONLINE",
     *   "commissionRate": 0.1500,
     *   "minCommission": 1.00,
     *   "description": "Online consultation – 15% platform fee"
     * }
     * </pre>
     *
     * @param dto dữ liệu cập nhật tỷ lệ chiết khấu
     * @return {@link CommissionConfigDTO} phản ánh trạng thái sau cập nhật
     * @throws BadRequestException nếu không tìm thấy cấu hình active cho serviceType
     */
    @PatchMapping("/configs")
    @Transactional
    public ResponseEntity<CommissionConfigDTO> updateCommissionConfig(
            @Valid @RequestBody CommissionConfigDTO dto) {

        log.info("Admin PATCH commission config: serviceType={}, newRate={}",
                dto.getServiceType(), dto.getCommissionRate());

        CommissionConfig config = commissionConfigRepository
                .findByServiceTypeAndActiveTrue(dto.getServiceType())
                .orElseThrow(() -> new BadRequestException(
                        "No active CommissionConfig found for serviceType: " + dto.getServiceType()
                        + ". Please create one first via POST /api/admin/commission-configs"));

        // Chỉ cập nhật các trường được phép thay đổi
        config.setCommissionRate(dto.getCommissionRate());
        if (dto.getMinCommission() != null) {
            config.setMinCommission(dto.getMinCommission());
        }
        if (dto.getDescription() != null && !dto.getDescription().isBlank()) {
            config.setDescription(dto.getDescription());
        }
        config.setUpdatedAt(LocalDateTime.now());

        CommissionConfig updated = commissionConfigRepository.save(config);

        log.info("CommissionConfig updated via PATCH: serviceType={}, rate={}",
                updated.getServiceType(), updated.getCommissionRate());

        return ResponseEntity.ok(toConfigDTO(updated));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Private helpers
    // ═══════════════════════════════════════════════════════════════════════

    /** Ánh xạ Settlement entity → SettlementResponse DTO. */
    private SettlementResponse toSettlementResponse(com.HealthLink.entity.Settlement s) {
        return SettlementResponse.builder()
                .settlementId(s.getSettlementId())
                .settlementNumber(s.getSettlementNumber())
                .recipientType(s.getRecipientType())
                .recipientId(s.getRecipientId())
                .recipientName(s.getRecipientName())
                .grossAmount(s.getGrossAmount())
                .commissionAmount(s.getCommissionAmount())
                .netAmount(s.getNetAmount())
                .status(s.getStatus())
                .paymentMethod(s.getPaymentMethod())
                .paypalEmail(s.getPaypalEmail())
                .periodStart(s.getPeriodStart())
                .periodEnd(s.getPeriodEnd())
                .processedAt(s.getProcessedAt())
                .completedAt(s.getCompletedAt())
                .notes(s.getNotes())
                .createdAt(s.getCreatedAt())
                .build();
    }

    /** Ánh xạ CommissionConfig entity → CommissionConfigDTO. */
    private CommissionConfigDTO toConfigDTO(CommissionConfig config) {
        return CommissionConfigDTO.builder()
                .serviceType(config.getServiceType())
                .commissionRate(config.getCommissionRate())
                .minCommission(config.getMinCommission())
                .description(config.getDescription())
                .build();
    }
}
