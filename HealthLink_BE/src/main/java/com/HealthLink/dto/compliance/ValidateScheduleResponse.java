package com.HealthLink.dto.compliance;

import com.HealthLink.entity.enums.ComplianceStatus;
import lombok.*;
import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ValidateScheduleResponse {
    private boolean compliant;
    private String complianceMonth;
    private Integer requiredHours;
    private BigDecimal scheduledHours;
    private BigDecimal hoursShortfall; // How many more hours needed
    private double compliancePercentage;
    private ComplianceStatus status;
    private boolean scheduleActive;
    private String message;
    private List<String> warnings;
    private List<String> suggestions;
}
