package com.HealthLink.service.payment;

import com.HealthLink.dto.payment.InvoiceResponse;
import com.HealthLink.dto.payment.PayPalCaptureRequest;
import com.HealthLink.dto.payment.PayPalOrderRequest;

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

    // -----------------------------------------------------------------------
    // Task 3.1 – Invoice generation
    // -----------------------------------------------------------------------

    /**
     * Tự động tạo một hóa đơn cho lịch hẹn đã hoàn tất.
     *
     * <p>Tổng hợp chi phí:
     * <ul>
     *   <li>consultationFee  – lấy từ Doctor.consultationFee</li>
     *   <li>medicineFee      – lấy từ PrescriptionHeader.totalAmount</li>
     *   <li>deliveryFee      – lấy từ PharmacyOrder.deliveryFee</li>
     * </ul>
     * amount = consultationFee + medicineFee + deliveryFee − discount + tax
     *
     * @param appointmentId mã lịch hẹn vừa hoàn tất
     * @return hóa đơn đã tạo dưới dạng DTO phản hồi
     */
    InvoiceResponse generateInvoice(Integer appointmentId);

    /**
     * Lấy thông tin chi tiết hóa đơn (bao gồm các bản ghi thanh toán con) theo ID hóa đơn.
     */
    InvoiceResponse getInvoice(Integer invoiceId);

    /**
     * Lấy tất cả hóa đơn của một bệnh nhân (lịch sử thanh toán).
     */
    List<InvoiceResponse> getInvoicesByPatient(String patientId);

    // -----------------------------------------------------------------------
    // Task 3.2 – PayPal integration
    // -----------------------------------------------------------------------

    /**
     * Tạo một đơn hàng PayPal và trả về orderId để front-end
     * dùng hiển thị PayPal Smart Buttons hoặc chuyển hướng.
     *
     * @param request chứa invoiceId và currency tùy chọn
     * @return map với tối thiểu {@code {"orderId": "..."} }
     */
    Map<String, Object> createPayPalOrder(PayPalOrderRequest request);

    /**
     * Xác nhận thanh toán sau khi người dùng đã duyệt đơn hàng PayPal.
     * Khi thành công:
     * <ul>
     *   <li>Lưu một bản ghi {@link com.HealthLink.entity.Payment}</li>
     *   <li>Thiết lập Invoice.paidAt và chuyển trạng thái sang STATUS_PAID</li>
     * </ul>
     *
     * @param request chứa orderId, invoiceId và paymentMethod
     * @return hóa đơn đã cập nhật dưới dạng phản hồi
     */
    InvoiceResponse capturePayPalPayment(PayPalCaptureRequest request);
}
