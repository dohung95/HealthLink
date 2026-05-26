package com.HealthLink.dto.compliance;

import com.HealthLink.entity.enums.ComplianceStatus;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ComplianceStatusResponse {
    private String doctorId;
    private String complianceMonth;
    private Integer requiredHours;
    private BigDecimal scheduledHours;
    private double compliancePercentage;
    private ComplianceStatus status;
    private boolean scheduleActive;
    private String statusMessage;
    private LocalDateTime lastUpdated;

    // For current month + next month display
    private ComplianceStatusResponse nextMonthStatus;
}
