package com.HealthLink.entity;

import com.HealthLink.entity.enums.NotificationChannel;
import com.HealthLink.entity.enums.NotificationPriority;
import com.HealthLink.entity.enums.NotificationType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Entity: Notification
 * Table: Notifications
 *
 * Quản lý thông báo đa kênh cho người dùng:
 * - WEB_SOCKET : Doctor / Pharmacy (Web UI - STOMP)
 * - MOBILE_PUSH: Patient (Mobile UI - FCM)
 * - EMAIL      : Tất cả (JavaMailSender)
 */
@Entity
@Table(name = "Notifications")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "NotificationID")
    private Integer notificationId;

    // -------------------------------------------------------------------------
    // Quan hệ với User
    // -------------------------------------------------------------------------
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "UserId", nullable = false)
    @ToString.Exclude
    private User user;

    // -------------------------------------------------------------------------
    // Loại thông báo (type) - dùng Enum NotificationType
    // Lưu dạng String(100) trong DB để dễ đọc / migration
    // -------------------------------------------------------------------------
    @Enumerated(EnumType.STRING)
    @Column(length = 100)
    private NotificationType type;

    // -------------------------------------------------------------------------
    // Nội dung thông báo
    // -------------------------------------------------------------------------
    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(length = 200)
    private String title;

    // -------------------------------------------------------------------------
    // Trạng thái đã đọc
    // -------------------------------------------------------------------------
    @Column(name = "IsRead")
    @Builder.Default
    private Boolean read = false;

    // -------------------------------------------------------------------------
    // Kênh gửi (sentVia) - dùng Enum NotificationChannel
    // WEB_SOCKET | MOBILE_PUSH | EMAIL
    // -------------------------------------------------------------------------
    @Enumerated(EnumType.STRING)
    @Column(name = "SentVia", length = 50)
    private NotificationChannel sentVia;

    // -------------------------------------------------------------------------
    // Mức ưu tiên (priority) - dùng Enum NotificationPriority
    // HIGH | NORMAL | LOW
    // -------------------------------------------------------------------------
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private NotificationPriority priority;

    // -------------------------------------------------------------------------
    // Thông tin bổ sung
    // -------------------------------------------------------------------------
    private Integer relatedId;
    private Integer appointmentId;

    @Column(length = 500)
    private String imageUrl;

    @Column(length = 500)
    private String actionUrl;

    @Column(columnDefinition = "TEXT")
    private String metadata;

    private LocalDateTime expiresAt;

    @Column(name = "CreatedAt", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
