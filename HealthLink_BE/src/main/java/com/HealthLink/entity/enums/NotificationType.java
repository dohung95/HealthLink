package com.HealthLink.entity.enums;

/**
 * Loại thông báo (type).
 * - APPOINTMENT_REMINDER : Nhắc lịch hẹn sắp tới
 * - NEW_PRESCRIPTION     : Đơn thuốc mới được tạo
 * - ORDER_STATUS         : Cập nhật trạng thái đơn hàng thuốc
 * - INVOICE_PAID         : Hóa đơn đã được thanh toán
 * - NEW_APPOINTMENT      : Bệnh nhân đặt lịch hẹn mới
 * - CANCEL_APPOINTMENT   : Lịch hẹn bị huỷ (bởi bệnh nhân hoặc bác sĩ)
 * - CANCEL_ORDER         : Đơn thuốc bị huỷ
 * - NEW_ORDER            : Đơn thuốc mới được đặt
 */
public enum NotificationType {
    APPOINTMENT_REMINDER,
    NEW_PRESCRIPTION,
    NEW_PHARMACY_REQUEST,
    ORDER_STATUS,
    INVOICE_PAID,
    NEW_APPOINTMENT,
    CANCEL_APPOINTMENT,
    CANCEL_ORDER,
    NEW_ORDER
}
