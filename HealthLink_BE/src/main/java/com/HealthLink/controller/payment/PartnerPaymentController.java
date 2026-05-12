package com.HealthLink.controller.payment;

import com.HealthLink.dto.payment.PartnerBalanceResponse;
import com.HealthLink.dto.payment.CommissionTransactionResponse;
import com.HealthLink.dto.payment.SettlementRequest;
import com.HealthLink.dto.payment.SettlementResponse;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.Pharmacy;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.InsufficientBalanceException;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.repository.pharmacy.PharmacyRepository;
import com.HealthLink.utility.payment.PartnerAccessValidator;
import com.HealthLink.service.payment.CommissionService;
import com.HealthLink.service.payment.SettlementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * REST Controller cho các endpoint đối tác (Doctor &amp; Pharmacy) quản lý
 * thu nhập và thực hiện rút tiền qua PayPal.
 *
 * <p>Đường dẫn gốc: {@code /api/payment/partner}
 *
 * <p>Các endpoint:
 * <ul>
 *   <li>GET  /api/payment/partner/{partnerId}/balance       – Số dư và trạng thái đủ điều kiện rút</li>
 *   <li>GET  /api/payment/partner/{partnerId}/transactions  – Lịch sử giao dịch chiết khấu</li>
 *   <li>POST /api/payment/partner/{partnerId}/settle        – Yêu cầu rút tiền chủ động (On-demand)</li>
 *   <li>GET  /api/payment/partner/{partnerId}/settlements   – Lịch sử lệnh rút tiền</li>
 * </ul>
 *
 * <p>Phân quyền: DOCTOR hoặc PHARMACY (đối tác chỉ được xem dữ liệu của chính mình).
 */
@Slf4j
@RestController
@RequestMapping("/api/payment/partner")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('DOCTOR', 'PHARMACY')")
public class PartnerPaymentController {

    /** Ngưỡng số dư tối thiểu để đủ điều kiện rút tiền (USD) */
    private static final BigDecimal MIN_WITHDRAWAL_THRESHOLD = new BigDecimal("10.00");

    private static final String PARTNER_TYPE_DOCTOR   = "DOCTOR";
    private static final String PARTNER_TYPE_PHARMACY = "PHARMACY";

    private final CommissionService    commissionService;
    private final SettlementService    settlementService;
    private final PartnerAccessValidator partnerAccessValidator;
    private final DoctorRepository     doctorRepository;
    private final PharmacyRepository   pharmacyRepository;

    // ═══════════════════════════════════════════════════════════════════════
    // GET /api/payment/partner/{partnerId}/balance
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Trả về số dư hiện tại ({@code pendingSettlement}), tổng thu nhập tích lũy
     * ({@code totalEarnings}) và thông báo trạng thái đủ điều kiện rút tiền.
     * Điều kiện rút: pendingBalance &ge; $10.00.
     *
     * <p>GET /api/payment/partner/{partnerId}/balance?type=DOCTOR|PHARMACY
     *
     * @param partnerId ID của đối tác (doctorId hoặc pharmacyId)
     * @param type      loại đối tác: DOCTOR hoặc PHARMACY
     * @return {@link PartnerBalanceResponse} chứa số dư và trạng thái đủ điều kiện
     */
    @GetMapping("/{partnerId}/balance")
    public ResponseEntity<PartnerBalanceResponse> getPartnerBalance(
            @PathVariable String partnerId,
            @RequestParam String type) {

        log.info("GET partner balance: partnerId={}, type={}", partnerId, type);
        partnerAccessValidator.assertPartnerAccess(partnerId, type);

        PartnerBalanceResponse response;
        if (PARTNER_TYPE_DOCTOR.equalsIgnoreCase(type)) {
            response = buildDoctorBalance(partnerId);
        } else if (PARTNER_TYPE_PHARMACY.equalsIgnoreCase(type)) {
            response = buildPharmacyBalance(partnerId);
        } else {
            throw new BadRequestException(
                    "Invalid partner type: '" + type + "'. Accepted values: DOCTOR, PHARMACY");
        }
        return ResponseEntity.ok(response);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // GET /api/payment/partner/{partnerId}/transactions
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Truy xuất danh sách các giao dịch chiết khấu (CommissionTransactions)
     * liên quan đến đối tác hiện tại, sắp xếp mới nhất lên đầu.
     *
     * <p>GET /api/payment/partner/{partnerId}/transactions
     *
     * @param partnerId ID đối tác (doctorId hoặc pharmacyId)
     * @return danh sách {@link CommissionTransactionResponse}
     */
    @GetMapping("/{partnerId}/transactions")
    public ResponseEntity<List<CommissionTransactionResponse>> getPartnerTransactions(
            @PathVariable String partnerId) {

        log.info("GET partner commission transactions: partnerId={}", partnerId);
        partnerAccessValidator.assertPartnerAccess(partnerId, null);

        List<CommissionTransactionResponse> transactions =
                commissionService.getTransactionsByRecipient(partnerId);

        return ResponseEntity.ok(transactions);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // POST /api/payment/partner/{partnerId}/settle
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Tiếp nhận yêu cầu rút tiền chủ động (On-demand Settlement).
     * Logic nghiệp vụ:
     * <ol>
     *   <li>Kiểm tra số dư pendingBalance &ge; $10.00</li>
     *   <li>Kiểm tra số tiền yêu cầu &le; số dư khả dụng</li>
     *   <li>Gọi SettlementService để khởi tạo lệnh chuyển tiền qua PayPal</li>
     * </ol>
     *
     * <p>POST /api/payment/partner/{partnerId}/settle?type=DOCTOR|PHARMACY
     *
     * @param partnerId ID đối tác
     * @param type      loại đối tác: DOCTOR hoặc PHARMACY
     * @param request   thông tin yêu cầu rút ({@link SettlementRequest})
     * @return {@link SettlementResponse} chi tiết lệnh rút tiền vừa tạo (HTTP 201 Created)
     * @throws InsufficientBalanceException nếu số dư &lt; $10.00 hoặc vượt số dư khả dụng
     */
    @PostMapping("/{partnerId}/settle")
    public ResponseEntity<SettlementResponse> requestSettlement(
            @PathVariable String partnerId,
            @RequestParam String type,
            @Valid @RequestBody SettlementRequest request) {

        log.info("POST on-demand settlement: partnerId={}, type={}, amount={}",
                partnerId, type, request.getAmount());

        // Kiểm tra số dư trước khi gọi service (guard sớm, service cũng sẽ kiểm tra lại)
        partnerAccessValidator.assertPartnerAccess(partnerId, type);
        validateBalanceBeforeSettle(partnerId, type, request.getAmount());

        SettlementResponse response;
        if (PARTNER_TYPE_DOCTOR.equalsIgnoreCase(type)) {
            response = settlementService.withdrawDoctorEarnings(partnerId, request);
        } else if (PARTNER_TYPE_PHARMACY.equalsIgnoreCase(type)) {
            response = settlementService.withdrawPharmacyEarnings(partnerId, request);
        } else {
            throw new BadRequestException(
                    "Invalid partner type: '" + type + "'. Accepted values: DOCTOR, PHARMACY");
        }

        log.info("Settlement initiated: settlementId={}, settlementNumber={}, status={}",
                response.getSettlementId(), response.getSettlementNumber(), response.getStatus());

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // GET /api/payment/partner/{partnerId}/settlements
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Xem lịch sử toàn bộ các lệnh rút tiền của đối tác và trạng thái thực tế
     * (PENDING, COMPLETED, FAILED), sắp xếp mới nhất lên đầu.
     *
     * <p>GET /api/payment/partner/{partnerId}/settlements
     *
     * @param partnerId ID đối tác
     * @return danh sách {@link SettlementResponse} theo thứ tự thời gian giảm dần
     */
    @GetMapping("/{partnerId}/settlements")
    public ResponseEntity<List<SettlementResponse>> getPartnerSettlements(
            @PathVariable String partnerId) {

        log.info("GET partner settlement history: partnerId={}", partnerId);
        partnerAccessValidator.assertPartnerAccess(partnerId, null);

        List<SettlementResponse> history = settlementService.getSettlementHistory(partnerId);
        return ResponseEntity.ok(history);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Private helpers
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Xây dựng {@link PartnerBalanceResponse} cho Bác sĩ.
     */
    private PartnerBalanceResponse buildDoctorBalance(String doctorId) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new BadRequestException("Doctor not found with ID: " + doctorId));

        BigDecimal pending      = safeBalance(doctor.getPendingSettlement());
        BigDecimal totalEarning = safeBalance(doctor.getTotalEarnings());
        boolean eligible        = pending.compareTo(MIN_WITHDRAWAL_THRESHOLD) >= 0;

        return PartnerBalanceResponse.builder()
                .partnerId(doctorId)
                .partnerType(PARTNER_TYPE_DOCTOR)
                .partnerName(doctor.getFullName())
                .pendingBalance(pending)
                .totalEarnings(totalEarning)
                .eligibleForWithdrawal(eligible)
                .withdrawalStatus(eligible
                        ? "Eligible for withdrawal. Available balance: $" + pending.toPlainString()
                        : String.format("Insufficient balance. Minimum is $%.2f. Current: $%.2f",
                                MIN_WITHDRAWAL_THRESHOLD, pending))
                .build();
    }

    /**
     * Xây dựng {@link PartnerBalanceResponse} cho Nhà thuốc.
     */
    private PartnerBalanceResponse buildPharmacyBalance(String pharmacyId) {
        Pharmacy pharmacy = pharmacyRepository.findById(pharmacyId)
                .orElseThrow(() -> new BadRequestException("Pharmacy not found with ID: " + pharmacyId));

        BigDecimal pending      = safeBalance(pharmacy.getPendingSettlement());
        BigDecimal totalEarning = safeBalance(pharmacy.getTotalEarnings());
        boolean eligible        = pending.compareTo(MIN_WITHDRAWAL_THRESHOLD) >= 0;

        return PartnerBalanceResponse.builder()
                .partnerId(pharmacyId)
                .partnerType(PARTNER_TYPE_PHARMACY)
                .partnerName(pharmacy.getName())
                .pendingBalance(pending)
                .totalEarnings(totalEarning)
                .eligibleForWithdrawal(eligible)
                .withdrawalStatus(eligible
                        ? "Eligible for withdrawal. Available balance: $" + pending.toPlainString()
                        : String.format("Insufficient balance. Minimum is $%.2f. Current: $%.2f",
                                MIN_WITHDRAWAL_THRESHOLD, pending))
                .build();
    }

    /**
     * Kiểm tra số dư trước khi chấp nhận yêu cầu rút tiền.
     * Ném {@link InsufficientBalanceException} nếu:
     * <ul>
     *   <li>Số dư &lt; $10.00</li>
     *   <li>Số tiền yêu cầu vượt quá số dư khả dụng</li>
     * </ul>
     */
    private void validateBalanceBeforeSettle(String partnerId, String type, BigDecimal requestAmount) {
        BigDecimal pending;
        if (PARTNER_TYPE_DOCTOR.equalsIgnoreCase(type)) {
            Doctor doctor = doctorRepository.findById(partnerId)
                    .orElseThrow(() -> new BadRequestException("Doctor not found: " + partnerId));
            pending = safeBalance(doctor.getPendingSettlement());
        } else if (PARTNER_TYPE_PHARMACY.equalsIgnoreCase(type)) {
            Pharmacy pharmacy = pharmacyRepository.findById(partnerId)
                    .orElseThrow(() -> new BadRequestException("Pharmacy not found: " + partnerId));
            pending = safeBalance(pharmacy.getPendingSettlement());
        } else {
            throw new BadRequestException("Invalid partner type: " + type);
        }

        if (pending.compareTo(MIN_WITHDRAWAL_THRESHOLD) < 0) {
            throw new InsufficientBalanceException(
                    String.format("Cannot withdraw: balance $%.2f is below minimum $%.2f.",
                            pending, MIN_WITHDRAWAL_THRESHOLD));
        }
        if (requestAmount.compareTo(pending) > 0) {
            throw new InsufficientBalanceException(
                    String.format("Requested amount $%.2f exceeds available balance $%.2f.",
                            requestAmount, pending));
        }
    }

    /** Chuyển null về BigDecimal.ZERO để tránh NPE khi tính toán số dư. */
    private BigDecimal safeBalance(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }
}
