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
    LOW_STOCK_WARNING,
    MEDICINE_EXPIRY_WARNING,

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
    DOCTOR_SCHEDULE_CHANGE_REQUEST, // Admin: Bác sĩ gửi yêu cầu đổi lịch

    // Schedule compliance notifications
    SCHEDULE_COMPLIANCE_WARNING,    // Doctor: Chưa đủ giờ làm việc
    DOCTOR_SCHEDULE_NON_COMPLIANT,  // Admin: Bác sĩ không đạt chuẩn số giờ
    SCHEDULE_COMPLIANCE_ACHIEVED,   // Doctor: Đã đạt đủ giờ làm việc
    SCHEDULE_MONTHLY_RECONFIRM_REQUIRED, // Doctor: Lịch kéo qua tháng mới, cần xác nhận lại
    DOCTOR_ACCOUNT_BANNED_NON_COMPLIANCE, // Doctor + Admin: Tài khoản bị khóa tự động do 3 tháng trong năm không đạt chỉ tiêu giờ làm

    // Review notifications
    NEW_REVIEW,                     // Doctor: Có review mới
    REVIEW_REPLY,                    // Patient: Doctor/Admin đã phản hồi review

    CLINICAL_RESULT_PUBLISHED,   // Patient: doctor published a lab/clinical result

    // Follow-up payment notifications
    FOLLOW_UP_PAYMENT_REQUEST,  // → Patient: doctor sent a payment request
    FOLLOW_UP_PAID,             // → Doctor: patient paid
    FOLLOW_UP_CONFIRMED,        // → Doctor: patient confirmed follow-up
    FOLLOW_UP_DENIED,           // → Doctor: patient denied

    PAYPAL_EMAIL_CHANGED       // → Doctor/Pharmacy: admin changed their PayPal payout email
}
