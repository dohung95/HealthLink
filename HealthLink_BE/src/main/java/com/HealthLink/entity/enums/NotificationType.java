package com.HealthLink.entity.enums;

public enum NotificationType {
    // Patient notifications
    APPOINTMENT_REMINDER,
    NEW_PRESCRIPTION,
    PRESCRIPTION_ISSUED,
    NEW_PHARMACY_REQUEST,
    PHARMACY_REQUEST_STATUS,
    ORDER_STATUS,
    PAYMENT_REQUIRED,
    INVOICE_PAID,
    WALLET_BALANCE_CHANGED,

    // Doctor/Pharmacy notifications
    NEW_APPOINTMENT,
    RESCHEDULE_APPOINTMENT,
    CANCEL_APPOINTMENT,
    HOME_VISIT_PROPOSED,   // → Patient
    HOME_VISIT_CONFIRMED,  // → Doctor
    HOME_VISIT_REJECTED,   // → Doctor
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
    SCHEDULE_COMPLIANCE_ACHIEVED,   // Doctor: Đã đạt đủ giờ làm việc

    // Review notifications
    NEW_REVIEW,                     // Doctor: Có review mới
    REVIEW_REPLY,                    // Patient: Doctor/Admin đã phản hồi review

    // Follow-up payment notifications
    FOLLOW_UP_PAYMENT_REQUEST,  // → Patient: doctor sent a payment request
    FOLLOW_UP_PAID,             // → Doctor: patient paid
    FOLLOW_UP_CONFIRMED,        // → Doctor: patient confirmed follow-up
    FOLLOW_UP_DENIED            // → Doctor: patient denied
}
