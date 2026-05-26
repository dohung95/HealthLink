package com.HealthLink.entity.enums;

public enum NotificationType {
    // Patient notifications
    APPOINTMENT_REMINDER,
    NEW_PRESCRIPTION,
    NEW_PHARMACY_REQUEST,
    ORDER_STATUS,
    INVOICE_PAID,
    WALLET_BALANCE_CHANGED,

    // Doctor/Pharmacy notifications
    NEW_APPOINTMENT,
    RESCHEDULE_APPOINTMENT,
    CANCEL_APPOINTMENT,
    CANCEL_ORDER,
    NEW_ORDER,
  
    // Admin notifications
    NEW_REGISTRATION,
    NEW_COMMISSION,

    // Admin schedule management notifications
    ADMIN_SCHEDULE_CHANGE,      // Admin block/mở slot của bác sĩ
    ADMIN_APPOINTMENT_CANCEL,   // Admin hủy lịch hẹn
    ADMIN_APPOINTMENT_REASSIGN, // Admin chuyển bác sĩ

    // Schedule compliance notifications
    SCHEDULE_COMPLIANCE_WARNING,    // Doctor: Chưa đủ giờ làm việc
    DOCTOR_SCHEDULE_NON_COMPLIANT,  // Admin: Bác sĩ không đạt chuẩn số giờ
    SCHEDULE_COMPLIANCE_ACHIEVED    // Doctor: Đã đạt đủ giờ làm việc
}
