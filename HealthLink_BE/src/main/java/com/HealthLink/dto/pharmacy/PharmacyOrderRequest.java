package com.HealthLink.dto.pharmacy;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PharmacyOrderRequest {

    /** Mã đơn thuốc (bắt buộc) */
    @NotNull(message = "Prescription header ID is required")
    private Integer prescriptionHeaderId;

    /** Mã nhà thuốc được chọn (bắt buộc) */
    @NotNull(message = "Pharmacy ID is required")
    private String pharmacyId;

    /**
     * Loại giao hàng: "Delivery" hoặc "Pickup" (mặc định: Delivery)
     */
    private String deliveryType = "Delivery";

    /** Địa chỉ giao hàng tùy chỉnh (nếu null, lấy từ Patient) */
    private String deliveryAddress;

    /** Vĩ độ giao hàng tùy chỉnh */
    private Double deliveryLatitude;

    /** Kinh độ giao hàng tùy chỉnh */
    private Double deliveryLongitude;

    /** Phương thức thanh toán */
    private String paymentMethod;

    /** Ghi chú của bệnh nhân/bác sĩ */
    private String notes;
}
