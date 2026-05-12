package com.HealthLink.controller.payment;

import com.HealthLink.dto.payment.InvoiceResponse;
import com.HealthLink.dto.payment.PayPalCaptureRequest;
import com.HealthLink.dto.payment.PayPalOrderRequest;
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
 *   <li>POST   /api/payment/invoices/generate/{appointmentId} – tự động tạo hóa đơn</li>
 *   <li>GET    /api/payment/invoices/{id}                     – chi tiết hóa đơn</li>
 *   <li>GET    /api/payment/history/patient/{patientId}        – lịch sử bệnh nhân</li>
 *   <li>POST   /api/payment/paypal/create                     – tạo đơn hàng PayPal</li>
 *   <li>POST   /api/payment/paypal/capture                    – xác nhận thanh toán</li>
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
     * Tự động tạo hóa đơn cho lịch hẹn đã hoàn tất.
     * Được gọi bởi bác sĩ/hệ thống khi buổi tư vấn kết thúc.
     *
     * POST /api/payment/invoices/generate/{appointmentId}
     */
    @PostMapping("/invoices/generate/{appointmentId}")
    public ResponseEntity<InvoiceResponse> generateInvoice(
            @PathVariable Integer appointmentId) {
        InvoiceResponse response = financeService.generateInvoice(appointmentId);
        return ResponseEntity.ok(response);
    }

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

    /**
     * Khởi tạo giao dịch PayPal và trả về orderID cho front-end.
     * Front-end dùng orderID này với các nút của PayPal JS SDK.
     *
     * POST /api/payment/paypal/create
     */
    @PostMapping("/paypal/create")
    public ResponseEntity<Map<String, Object>> createPayPalOrder(
            @Valid @RequestBody PayPalOrderRequest request) {
        Map<String, Object> result = financeService.createPayPalOrder(request);
        return ResponseEntity.ok(result);
    }

    /**
     * Xác nhận thanh toán sau khi người dùng duyệt trên PayPal.
     * Cập nhật hóa đơn sang PAID và lưu bản ghi Payment.
     *
     * POST /api/payment/paypal/capture
     */
    @PostMapping("/paypal/capture")
    public ResponseEntity<InvoiceResponse> capturePayPalPayment(
            @Valid @RequestBody PayPalCaptureRequest request) {
        InvoiceResponse response = financeService.capturePayPalPayment(request);
        return ResponseEntity.ok(response);
    }
}
