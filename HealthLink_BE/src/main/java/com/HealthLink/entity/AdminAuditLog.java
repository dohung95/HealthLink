package com.HealthLink.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "AdminAuditLogs", indexes = {
    @Index(name = "IX_AdminAuditLogs_Category", columnList = "Category"),
    @Index(name = "IX_AdminAuditLogs_ActionType", columnList = "ActionType"),
    @Index(name = "IX_AdminAuditLogs_CreatedAt", columnList = "CreatedAt")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "LogId")
    private Long logId;

    @Column(name = "Category", length = 50, nullable = false)
    private String category; // USER, REGISTRATION, COMMISSION

    @Column(name = "ActionType", length = 50, nullable = false)
    private String actionType; // USER_STATUS_CHANGED, REGISTRATION_APPROVED, etc.

    @Column(name = "TargetType", length = 50)
    private String targetType; // PATIENT, DOCTOR, PHARMACY, CONFIG

    @Column(name = "TargetId", length = 450)
    private String targetId; // ID of the affected entity

    @Column(name = "TargetName", length = 255)
    private String targetName; // Display name (fullName, pharmacyName, etc.)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "AdminUserId", nullable = false)
    @ToString.Exclude
    private User adminUser;

    @Column(name = "Description", length = 1000)
    private String description;

    @Column(name = "OldValue", columnDefinition = "NVARCHAR(MAX)")
    private String oldValue; // JSON format for old state

    @Column(name = "NewValue", columnDefinition = "NVARCHAR(MAX)")
    private String newValue; // JSON format for new state

    @Column(name = "Reason", length = 500)
    private String reason;

    @Column(name = "IpAddress", length = 50)
    private String ipAddress;

    @Builder.Default
    @Column(name = "CreatedAt", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    // Category constants
    public static final String CATEGORY_USER = "USER";
    public static final String CATEGORY_REGISTRATION = "REGISTRATION";
    public static final String CATEGORY_COMMISSION = "COMMISSION";

    // Action type constants
    public static final String ACTION_USER_STATUS_CHANGED = "USER_STATUS_CHANGED";
    public static final String ACTION_REGISTRATION_APPROVED = "REGISTRATION_APPROVED";
    public static final String ACTION_REGISTRATION_REJECTED = "REGISTRATION_REJECTED";
    public static final String ACTION_AI_REJECTED = "AI_REJECTED";
    public static final String ACTION_COMMISSION_CONFIG_CHANGED = "COMMISSION_CONFIG_CHANGED";
    public static final String ACTION_COMMISSION_PARTNER_CHANGED = "COMMISSION_PARTNER_CHANGED";
    public static final String ACTION_COMMISSION_PARTNER_RESET = "COMMISSION_PARTNER_RESET";
    public static final String ACTION_PAYPAL_EMAIL_CHANGED = "PAYPAL_EMAIL_CHANGED";

    // Target type constants
    public static final String TARGET_PATIENT = "PATIENT";
    public static final String TARGET_DOCTOR = "DOCTOR";
    public static final String TARGET_PHARMACY = "PHARMACY";
    public static final String TARGET_CONFIG = "CONFIG";
}
