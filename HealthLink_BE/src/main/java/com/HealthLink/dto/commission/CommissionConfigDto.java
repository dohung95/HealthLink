package com.HealthLink.dto.commission;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommissionConfigDto {
    private Integer configId;
    private String serviceType;
    private BigDecimal commissionRate;
    private BigDecimal minCommission;
    private BigDecimal maxCommission;
    private String description;
    private boolean active;
    private LocalDateTime effectiveFrom;
    private LocalDateTime effectiveTo;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
