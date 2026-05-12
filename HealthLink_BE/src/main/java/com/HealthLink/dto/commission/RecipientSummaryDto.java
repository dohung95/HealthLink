package com.HealthLink.dto.commission;

import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecipientSummaryDto {
    private String recipientId;
    private String recipientName;
    private String recipientType;
    private BigDecimal totalGross;
    private BigDecimal totalCommission;
    private BigDecimal totalNet;
    private BigDecimal pendingAmount;
    private Long transactionCount;
}
