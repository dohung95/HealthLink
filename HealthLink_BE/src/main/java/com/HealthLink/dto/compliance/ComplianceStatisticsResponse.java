package com.HealthLink.dto.compliance;

import lombok.*;
import java.util.Map;

@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ComplianceStatisticsResponse {
    private String complianceMonth;
    private int totalDoctors;
    private int compliantCount;
    private int inProgressCount;
    private int pendingCount;
    private int nonCompliantCount;
    private int exemptedCount;

    private double compliantPercentage;
    private double averageCompliancePercentage;

    // Breakdown by specialty
    private Map<String, SpecialtyStats> bySpecialty;

    @Data
    @NoArgsConstructor @AllArgsConstructor
    @Builder
    public static class SpecialtyStats {
        private String specialtyName;
        private int totalDoctors;
        private int compliantCount;
        private int nonCompliantCount;
        private double complianceRate;
    }
}
