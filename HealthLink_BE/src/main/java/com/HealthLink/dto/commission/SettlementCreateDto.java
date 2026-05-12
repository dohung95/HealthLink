package com.HealthLink.dto.commission;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SettlementCreateDto {
    private String recipientType;
    private String recipientId;
    private LocalDateTime periodStart;
    private LocalDateTime periodEnd;
    private List<Integer> transactionIds;
    private String paymentMethod;
    private String notes;
}
