package com.HealthLink.entity.enums;

public enum NotificationType {
    // Patient notifications
    APPOINTMENT_REMINDER,
    NEW_PRESCRIPTION,
    NEW_PHARMACY_REQUEST,
    ORDER_STATUS,

    // Doctor/Pharmacy notifications
    NEW_APPOINTMENT,
    CANCEL_APPOINTMENT,
    CANCEL_ORDER,
    NEW_ORDER,
    INVOICE_PAID,

    // Admin notifications
    NEW_REGISTRATION,
    NEW_COMMISSION,

    // Admin schedule management notifications
    ADMIN_SCHEDULE_CHANGE,      // Admin block/mở slot của bác sĩ
    ADMIN_APPOINTMENT_CANCEL,   // Admin hủy lịch hẹn
    ADMIN_APPOINTMENT_REASSIGN  // Admin chuyển bác sĩ
}
