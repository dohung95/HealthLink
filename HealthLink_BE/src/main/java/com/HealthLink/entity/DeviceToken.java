package com.HealthLink.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Entity: DeviceToken
 * Table: DeviceTokens
 *
 * Lưu trữ FCM Token (Firebase Cloud Messaging) của bệnh nhân.
 * Mỗi thiết bị di động sẽ có một token riêng để nhận Push Notification.
 * Token có thể hết hạn hoặc bị thu hồi, cần được cập nhật khi app khởi động.
 */
@Entity
@Table(
    name = "DeviceTokens",
    uniqueConstraints = @UniqueConstraint(
        name = "UQ_DeviceToken_User_Token",
        columnNames = {"UserId", "Token"}
    )
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeviceToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "DeviceTokenID")
    private Integer deviceTokenId;

    // -------------------------------------------------------------------------
    // Quan hệ với User (bệnh nhân sở hữu thiết bị)
    // -------------------------------------------------------------------------
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "UserId", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User user;

    // -------------------------------------------------------------------------
    // FCM Token - định danh duy nhất của thiết bị trên Firebase
    // -------------------------------------------------------------------------
    @Column(name = "Token", nullable = false, columnDefinition = "TEXT")
    private String token;

    // -------------------------------------------------------------------------
    // Thông tin thiết bị
    // -------------------------------------------------------------------------
    @Column(name = "DeviceName", length = 200)
    private String deviceName;

    /**
     * Nền tảng thiết bị: ANDROID | IOS
     */
    @Column(name = "Platform", length = 20)
    private String platform;

    // -------------------------------------------------------------------------
    // Trạng thái token
    // -------------------------------------------------------------------------
    /**
     * Token còn hiệu lực hay không.
     * Đặt false khi nhận lỗi UNREGISTERED / INVALID_REGISTRATION từ FCM.
     */
    @Column(name = "Active")
    @Builder.Default
    private Boolean active = true;

    @Column(name = "CreatedAt", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "UpdatedAt")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    // -------------------------------------------------------------------------
    // Lifecycle hook: tự cập nhật updatedAt
    // -------------------------------------------------------------------------
    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
