package com.HealthLink.dto.commission.admin;

import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminYearlyCommissionDto {
    private Integer year;
    private BigDecimal grossAmount;
    private BigDecimal commissionAmount;
    private BigDecimal netAmount;
    private Long transactionCount;
}
