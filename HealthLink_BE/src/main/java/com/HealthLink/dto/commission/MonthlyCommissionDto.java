package com.HealthLink.dto.commission;

import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MonthlyCommissionDto {
    private Integer year;
    private Integer month;
    private String monthName;
    private BigDecimal grossAmount;
    private BigDecimal commissionAmount;
    private Long transactionCount;
}
