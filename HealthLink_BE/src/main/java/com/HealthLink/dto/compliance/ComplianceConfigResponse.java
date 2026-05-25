package com.HealthLink.dto.compliance;

import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ComplianceConfigResponse {
    private Integer configId;
    private Integer specialtyId;
    private String specialtyName;
    private Integer minHoursPerMonth;
    private Integer warningThresholdPercent;
    private String description;
    private boolean active;
    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private boolean isGlobal; // true if specialtyId is null
}
