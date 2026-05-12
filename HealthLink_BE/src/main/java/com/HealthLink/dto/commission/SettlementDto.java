package com.HealthLink.dto.commission;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SettlementDto {
    private Integer settlementId;
    private String settlementNumber;
    private String recipientType;
    private String recipientId;
    private String recipientName;
    private BigDecimal grossAmount;
    private BigDecimal commissionAmount;
    private BigDecimal netAmount;
    private Integer transactionCount;
    private String status;
    private String paymentMethod;
    private String bankAccount;
    private String bankName;
    private String paypalEmail;
    private LocalDateTime periodStart;
    private LocalDateTime periodEnd;
    private LocalDateTime processedAt;
    private String processedBy;
    private LocalDateTime completedAt;
    private String notes;
    private LocalDateTime createdAt;
    private List<CommissionTransactionDto> transactions;
}
