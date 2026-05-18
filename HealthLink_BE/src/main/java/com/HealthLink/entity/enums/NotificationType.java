package com.HealthLink.entity.enums;

/**
 * Loại thông báo (type).
 *
 * === Cho Patient (Mobile Push) ===
 * - APPOINTMENT_REMINDER : Nhắc lịch hẹn sắp tới
 * - NEW_PRESCRIPTION     : Đơn thuốc mới được tạo
 * - ORDER_STATUS         : Cập nhật trạng thái đơn hàng thuốc
 *
 * === Cho Doctor/Pharmacy (WebSocket) ===
 * - NEW_APPOINTMENT      : Bệnh nhân đặt lịch hẹn mới
 * - CANCEL_APPOINTMENT   : Lịch hẹn bị huỷ (bởi bệnh nhân hoặc bác sĩ)
 * - CANCEL_ORDER         : Đơn thuốc bị huỷ
 * - NEW_ORDER            : Đơn thuốc mới được đặt
 * - INVOICE_PAID         : Hóa đơn đã được thanh toán
 *
 * === Cho Admin (WebSocket) ===
 * - NEW_REGISTRATION     : Doctor/Pharmacy đăng ký tài khoản mới
 * - NEW_COMMISSION       : Giao dịch hoa hồng mới
 */
public enum NotificationType {
    // Patient notifications
    APPOINTMENT_REMINDER,
    NEW_PRESCRIPTION,
    ORDER_STATUS,

    // Doctor/Pharmacy notifications
    NEW_APPOINTMENT,
    CANCEL_APPOINTMENT,
    CANCEL_ORDER,
    NEW_ORDER,
    INVOICE_PAID,

    // Admin notifications
    NEW_REGISTRATION,
    NEW_COMMISSION
}
