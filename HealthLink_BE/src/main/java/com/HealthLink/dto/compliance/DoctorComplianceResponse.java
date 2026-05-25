package com.HealthLink.dto.compliance;

import com.HealthLink.entity.enums.ComplianceStatus;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class DoctorComplianceResponse {
    private Integer complianceId;
    private String doctorId;
    private String doctorName;
    private String specialty;
    private String avatarUrl;
    private String complianceMonth;
    private Integer requiredHours;
    private BigDecimal scheduledHours;
    private double compliancePercentage;
    private ComplianceStatus status;
    private String statusDisplay;
    private boolean scheduleActive;
    private LocalDateTime lastNotificationSent;
    private boolean adminNotified;
    private String notes;

    // Exemption info
    private boolean isExempted;
    private String exemptedBy;
    private LocalDateTime exemptedAt;
    private String exemptReason;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
