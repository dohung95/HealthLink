package com.HealthLink.dto.admin;

import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminAuditLogDto {
    private Long logId;
    private String category;
    private String categoryDisplay;
    private String actionType;
    private String actionTypeDisplay;
    private String targetType;
    private String targetId;
    private String targetName;
    private String adminUserId;
    private String adminUserName;
    private String adminEmail;
    private String description;
    private String oldValue;
    private String newValue;
    private String reason;
    private String ipAddress;
    private LocalDateTime createdAt;

    // Helper method to get display text for category
    public static String getCategoryDisplay(String category) {
        if (category == null) return "";
        return switch (category) {
            case "USER" -> "User Management";
            case "REGISTRATION" -> "Registration";
            case "COMMISSION" -> "Commission";
            default -> category;
        };
    }

    // Helper method to get display text for action type
    public static String getActionTypeDisplay(String actionType) {
        if (actionType == null) return "";
        return switch (actionType) {
            case "USER_STATUS_CHANGED" -> "Status Changed";
            case "REGISTRATION_APPROVED" -> "Approved";
            case "REGISTRATION_REJECTED" -> "Rejected";
            case "COMMISSION_CONFIG_CHANGED" -> "Config Changed";
            case "COMMISSION_PARTNER_CHANGED" -> "Partner Rate Changed";
            case "COMMISSION_PARTNER_RESET" -> "Partner Rate Reset";
            default -> actionType;
        };
    }
}
