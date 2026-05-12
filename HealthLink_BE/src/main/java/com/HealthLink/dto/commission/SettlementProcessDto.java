package com.HealthLink.dto.commission;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SettlementProcessDto {
    private Integer settlementId;
    private String action;
    private String notes;
}
