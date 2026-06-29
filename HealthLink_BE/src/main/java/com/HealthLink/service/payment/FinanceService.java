package com.HealthLink.service.payment;

import com.HealthLink.dto.consultation.FollowUpResponse;
import com.HealthLink.dto.payment.InvoiceResponse;
import com.HealthLink.dto.payment.AppointmentPayPalCaptureRequest;
import com.HealthLink.dto.payment.AppointmentPayPalOrderRequest;
import com.HealthLink.dto.payment.PharmacyOrderPayPalCaptureRequest;
import com.HealthLink.dto.payment.PharmacyOrderPayPalOrderRequest;
import com.HealthLink.dto.pharmacy.PharmacyOrderResponse;

import java.util.List;
import java.util.Map;

/**
 * FinanceService – giao diện trung tâm cho các thao tác hóa đơn và thanh toán PayPal.
 *
 * <p>Các tác vụ được bao gồm:
 * <ul>
 *   <li>3.1 – Tự động tạo hóa đơn khi buổi tư vấn hoàn tất</li>
 *   <li>3.2 – Luồng PayPal tạo đơn hàng và xác nhận thanh toán</li>
 * </ul>
 */
public interface FinanceService {

    /**
     * Lấy thông tin chi tiết hóa đơn (bao gồm các bản ghi thanh toán con) theo ID hóa đơn.
     */
    InvoiceResponse getInvoice(Integer invoiceId);

    /**
     * Lấy tất cả hóa đơn của một bệnh nhân (lịch sử thanh toán).
     */
    List<InvoiceResponse> getInvoicesByPatient(String patientId);

    // -----------------------------------------------------------------------
    // PayPal integration
    // -----------------------------------------------------------------------

    Map<String, Object> createAppointmentPayPalOrder(AppointmentPayPalOrderRequest request);

    Map<String, Object> createPharmacyOrderPayPalOrder(PharmacyOrderPayPalOrderRequest request);

    InvoiceResponse captureAppointmentPayPalPayment(AppointmentPayPalCaptureRequest request);

    PharmacyOrderResponse capturePharmacyOrderPayPalPayment(PharmacyOrderPayPalCaptureRequest request);

    Map<String, Object> createFollowUpPayPalOrder(Integer appointmentId);
    FollowUpResponse captureFollowUpPayPalPayment(String orderId, Integer appointmentId, String paymentMethod);

    /**
     * Generate PDF for an invoice.
     */
    byte[] generateInvoicePdf(Integer invoiceId);

    /**
     * Xử lý hoàn tiền cho bệnh nhân.
     * Khi một Payment được yêu cầu hoàn tiền:
     * <ul>
     *   <li>Chuyển trạng thái Payment → REFUNDED</li>
     *   <li>Chuyển trạng thái Invoice → REFUNDED</li>
     *   <li>Gọi CommissionService.processRefund() để truy vết và trừ pendingSettlement đối tác</li>
     * </ul>
     *
     * @param paymentId    ID của Payment cần hoàn tiền
     * @param refundReason lý do hoàn tiền (tùy chọn)
     * @return hóa đơn đã cập nhật
     */
    InvoiceResponse processRefund(Integer paymentId, String refundReason);
}
