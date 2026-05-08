package com.HealthLink.dto.pharmacy;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PharmacyOrderStatusRequest {

    /** Trạng thái mới cần cập nhật */
    @NotBlank(message = "New status is required")
    private String status;

    /** Ghi chú của dược sĩ (tùy chọn) */
    private String pharmacistNotes;

    /** Thời gian giao hàng dự kiến (tùy chọn, khi chuyển sang Shipping) */
    private java.time.LocalDateTime estimatedDeliveryTime;

    /** Lý do hủy (bắt buộc khi status = Cancelled) */
    private String cancelReason;

    /** Ai hủy (Patient/Pharmacy/System) */
    private String cancelledBy;
}
