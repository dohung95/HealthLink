package com.HealthLink.controller.payment;

import com.HealthLink.dto.payment.SettlementRequest;
import com.HealthLink.dto.payment.SettlementResponse;
import com.HealthLink.service.payment.SettlementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller cho các endpoint rút tiền (Settlement) của đối tác.
 *
 * <p>Đường dẫn gốc: /api/settlement
 *
 * <p>Các endpoint:
 * <ul>
 *   <li>POST /api/settlement/doctor/{doctorId}/withdraw      – Bác sĩ yêu cầu rút tiền</li>
 *   <li>POST /api/settlement/pharmacy/{pharmacyId}/withdraw  – Nhà thuốc yêu cầu rút tiền</li>
 *   <li>GET  /api/settlement/history/{recipientId}           – Xem lịch sử rút tiền</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/settlement")
@RequiredArgsConstructor
public class SettlementController {

    private final SettlementService settlementService;

    // ──────────────────────────────────────────────────────────────────────
    // Rút tiền – Bác sĩ
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Bác sĩ yêu cầu rút thu nhập tích lũy về PayPal cá nhân.
     * Kiểm tra pendingSettlement ≥ $10 và xác thực paypalEmail.
     *
     * POST /api/settlement/doctor/{doctorId}/withdraw
     */
    @PostMapping("/doctor/{doctorId}/withdraw")
    public ResponseEntity<SettlementResponse> withdrawDoctorEarnings(
            @PathVariable String doctorId,
            @Valid @RequestBody SettlementRequest request) {
        SettlementResponse response = settlementService.withdrawDoctorEarnings(doctorId, request);
        return ResponseEntity.ok(response);
    }

    // ──────────────────────────────────────────────────────────────────────
    // Rút tiền – Nhà thuốc
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Nhà thuốc yêu cầu rút thu nhập tích lũy về PayPal cá nhân.
     * Kiểm tra pendingSettlement ≥ $10 và xác thực paypalEmail.
     *
     * POST /api/settlement/pharmacy/{pharmacyId}/withdraw
     */
    @PostMapping("/pharmacy/{pharmacyId}/withdraw")
    public ResponseEntity<SettlementResponse> withdrawPharmacyEarnings(
            @PathVariable String pharmacyId,
            @Valid @RequestBody SettlementRequest request) {
        SettlementResponse response = settlementService.withdrawPharmacyEarnings(pharmacyId, request);
        return ResponseEntity.ok(response);
    }

    // ──────────────────────────────────────────────────────────────────────
    // Lịch sử rút tiền
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Lấy lịch sử tất cả yêu cầu rút tiền của một đối tác (Doctor hoặc Pharmacy).
     * Trả về danh sách sắp xếp theo thời gian mới nhất lên đầu.
     *
     * GET /api/settlement/history/{recipientId}
     */
    @GetMapping("/history/{recipientId}")
    public ResponseEntity<List<SettlementResponse>> getSettlementHistory(
            @PathVariable String recipientId) {
        return ResponseEntity.ok(settlementService.getSettlementHistory(recipientId));
    }
}
