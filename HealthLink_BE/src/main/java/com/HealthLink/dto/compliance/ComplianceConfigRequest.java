package com.HealthLink.dto.compliance;

import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDate;

@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ComplianceConfigRequest {

    private Integer specialtyId; // null for global config

    @NotNull(message = "Minimum hours per month is required")
    @Min(value = 1, message = "Minimum hours must be at least 1")
    @Max(value = 200, message = "Minimum hours cannot exceed 200")
    private Integer minHoursPerMonth;

    @Min(value = 50, message = "Warning threshold must be at least 50%")
    @Max(value = 100, message = "Warning threshold cannot exceed 100%")
    private Integer warningThresholdPercent;

    @Size(max = 500, message = "Description cannot exceed 500 characters")
    private String description;

    private boolean active = true;

    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
}
