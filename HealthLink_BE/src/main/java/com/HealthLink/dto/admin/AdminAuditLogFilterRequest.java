package com.HealthLink.dto.admin;

import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminAuditLogFilterRequest {
    private String category;      // USER, REGISTRATION, COMMISSION
    private String actionType;    // USER_STATUS_CHANGED, etc.
    private String targetType;    // PATIENT, DOCTOR, PHARMACY, CONFIG
    private String targetId;
    private String adminUserId;
    private LocalDateTime startTime;
    private LocalDateTime endTime;

    @Builder.Default
    private Integer pageNumber = 1;

    @Builder.Default
    private Integer pageSize = 20;

    @Builder.Default
    private String sortBy = "createdAt";

    @Builder.Default
    private String sortDir = "desc";
}
