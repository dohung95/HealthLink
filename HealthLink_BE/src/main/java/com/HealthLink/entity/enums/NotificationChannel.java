package com.HealthLink.entity.enums;

/**
 * Kênh gửi thông báo (sentVia).
 * - WEB_SOCKET : Dành cho Web UI của Doctor và Pharmacy (realtime qua STOMP/WebSocket)
 * - MOBILE_PUSH: Dành cho Mobile UI của Patient (Firebase Cloud Messaging)
 * - EMAIL      : Gửi email tự động qua JavaMailSender
 */
public enum NotificationChannel {
    WEB_SOCKET,
    MOBILE_PUSH,
    EMAIL
}
