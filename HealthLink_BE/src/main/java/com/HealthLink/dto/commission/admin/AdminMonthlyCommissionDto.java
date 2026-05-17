package com.HealthLink.dto.commission.admin;

import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminMonthlyCommissionDto {
    private Integer year;
    private Integer month;
    private String monthName;
    private BigDecimal grossAmount;
    private BigDecimal commissionAmount;
    private Long transactionCount;
}
