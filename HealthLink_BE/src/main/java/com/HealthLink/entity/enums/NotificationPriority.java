package com.HealthLink.entity.enums;

/**
 * Mức ưu tiên của thông báo (priority).
 * - HIGH  : Khẩn cấp, cần xử lý ngay (vd: lịch hẹn trong 30 phút)
 * - NORMAL: Thông thường (vd: đơn thuốc mới, trạng thái đơn hàng)
 * - LOW   : Thông tin (vd: khuyến mãi, nhắc nhở định kỳ)
 */
public enum NotificationPriority {
    HIGH,
    NORMAL,
    LOW
}
