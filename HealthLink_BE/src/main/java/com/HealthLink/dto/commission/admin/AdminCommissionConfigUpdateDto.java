package com.HealthLink.dto.commission.admin;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminCommissionConfigUpdateDto {
    private BigDecimal commissionRate;
    private BigDecimal minCommission;
    private BigDecimal maxCommission;
    private String description;
    private LocalDateTime effectiveFrom;
    private LocalDateTime effectiveTo;
}
