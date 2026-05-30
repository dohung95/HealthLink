package com.HealthLink.controller.payment;

import com.HealthLink.dto.payment.InvoiceResponse;
import com.HealthLink.dto.payment.AppointmentPayPalCaptureRequest;
import com.HealthLink.dto.payment.AppointmentPayPalOrderRequest;
import com.HealthLink.dto.payment.PharmacyOrderPayPalCaptureRequest;
import com.HealthLink.dto.payment.PharmacyOrderPayPalOrderRequest;
import com.HealthLink.dto.pharmacy.PharmacyOrderResponse;
import com.HealthLink.service.payment.FinanceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;


import java.util.List;
import java.util.Map;

/**
 * REST controller cho các endpoint Finance và Payment.
 *
 * <p>Đường dẫn gốc: /api/payment
 *
 * <p>Các endpoint:
 * <ul>
 *   <li>GET    /api/payment/invoices/{id}                     – chi tiết hóa đơn</li>
 *   <li>GET    /api/payment/history/patient/{patientId}        – lịch sử bệnh nhân</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/payment")
@RequiredArgsConstructor
public class PaymentController {

    private final FinanceService financeService;

    // ──────────────────────────────────────────────────────────────────────
    // Các endpoint hóa đơn
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Lấy chi tiết hóa đơn và trạng thái thanh toán theo ID hóa đơn.
     * Trường {@code platformFee}, {@code doctorEarning} và {@code commissionRate}
     * chỉ hiển thị cho Admin và đối tác liên quan (DOCTOR / PHARMACY);
     * bệnh nhân chỉ nhận thông tin chi phí cơ bản.
     *
     * GET /api/payment/invoices/{id}
     *
     * @param id ID hóa đơn
     * @return {@link InvoiceResponse} chứa thông tin đầy đủ (Admin/Doctor/Pharmacy)
     *         hoặc thông tin rút gọn (Patient – commission fields = null)
     */
    @GetMapping("/invoices/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR', 'PHARMACY', 'PATIENT')")
    public ResponseEntity<InvoiceResponse> getInvoice(@PathVariable Integer id) {
        return ResponseEntity.ok(financeService.getInvoice(id));
    }

    /**
     * Lấy tất cả hóa đơn (lịch sử thanh toán) của một bệnh nhân.
     *
     * GET /api/payment/history/patient/{patientId}
     */
    @GetMapping("/history/patient/{patientId}")
    public ResponseEntity<List<InvoiceResponse>> getPatientHistory(
            @PathVariable String patientId) {
        return ResponseEntity.ok(financeService.getInvoicesByPatient(patientId));
    }

    // ──────────────────────────────────────────────────────────────────────
    // Các endpoint PayPal
    // ──────────────────────────────────────────────────────────────────────

    @PostMapping("/appointments/paypal/create")
    public ResponseEntity<Map<String, Object>> createAppointmentPayPalOrder(
            @Valid @RequestBody AppointmentPayPalOrderRequest request) {
        return ResponseEntity.ok(financeService.createAppointmentPayPalOrder(request));
    }

    @PostMapping("/pharmacy-orders/paypal/create")
    public ResponseEntity<Map<String, Object>> createPharmacyOrderPayPalOrder(
            @Valid @RequestBody PharmacyOrderPayPalOrderRequest request) {
        return ResponseEntity.ok(financeService.createPharmacyOrderPayPalOrder(request));
    }

    @PostMapping("/appointments/paypal/capture")
    public ResponseEntity<InvoiceResponse> captureAppointmentPayPalPayment(
            @Valid @RequestBody AppointmentPayPalCaptureRequest request) {
        return ResponseEntity.ok(financeService.captureAppointmentPayPalPayment(request));
    }

    @PostMapping("/pharmacy-orders/paypal/capture")
    public ResponseEntity<PharmacyOrderResponse> capturePharmacyOrderPayPalPayment(
            @Valid @RequestBody PharmacyOrderPayPalCaptureRequest request) {
        return ResponseEntity.ok(financeService.capturePharmacyOrderPayPalPayment(request));
    }

    // ──────────────────────────────────────────────────────────────────────
    // Hoàn tiền (Refund)
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Xử lý hoàn tiền cho bệnh nhân.
     * <ul>
     *   <li>Cập nhật Payment → REFUNDED</li>
     *   <li>Cập nhật Invoice → Refunded</li>
     *   <li>Truy vết và trừ lại pendingSettlement của đối tác liên quan</li>
     * </ul>
     *
     * POST /api/payment/refund/{paymentId}
     *
     * @param paymentId    ID của bản ghi thanh toán cần hoàn tiền
     * @param refundReason lý do hoàn tiền (tùy chọn, qua query param)
     */
    @PostMapping("/refund/{paymentId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<InvoiceResponse> processRefund(
            @PathVariable Integer paymentId,
            @RequestParam(required = false) String refundReason) {
        InvoiceResponse response = financeService.processRefund(paymentId, refundReason);
        return ResponseEntity.ok(response);
    }
}
