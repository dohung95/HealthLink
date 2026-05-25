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
    NEW_COMMISSION
}
