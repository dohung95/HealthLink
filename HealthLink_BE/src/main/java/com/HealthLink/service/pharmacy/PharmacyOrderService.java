package com.HealthLink.service.pharmacy;

import com.HealthLink.dto.pharmacy.PharmacyOrderRequest;
import com.HealthLink.dto.pharmacy.PharmacyOrderResponse;
import com.HealthLink.dto.pharmacy.PharmacyOrderStatusRequest;

import java.util.List;

public interface PharmacyOrderService {

    /**
     * Task 2.1 & 2.3 – Bác sĩ chuyển đơn thuốc sang nhà thuốc.
     * Tạo PharmacyOrder, tính tổng tiền, tự động điền địa chỉ giao từ Patient.
     *
     * @param request dữ liệu chuyển đơn
     * @return thông tin đơn hàng vừa tạo
     */
    PharmacyOrderResponse transferPrescription(PharmacyOrderRequest request);

    /**
     * Task 2.2 – Dược sĩ cập nhật trạng thái đơn hàng.
     * Kiểm tra luồng trạng thái hợp lệ và ghi nhận timestamp.
     *
     * @param orderId mã đơn hàng
     * @param request trạng thái mới + ghi chú
     * @return đơn hàng sau cập nhật
     */
    PharmacyOrderResponse updateOrderStatus(Integer orderId, PharmacyOrderStatusRequest request);

    /**
     * Danh sách đơn hàng dành cho nhà thuốc (tùy chọn lọc theo status).
     */
    List<PharmacyOrderResponse> getOrdersByPharmacy(String pharmacyId, String status);

    /**
     * Bệnh nhân theo dõi tất cả đơn thuốc của mình.
     */
    List<PharmacyOrderResponse> getOrdersByPatient(String patientId);

    List<PharmacyOrderResponse> getOrdersByDoctor(String doctorId);

    /**
     * Lấy chi tiết một đơn hàng.
     */
    PharmacyOrderResponse getOrderById(Integer orderId);
}
