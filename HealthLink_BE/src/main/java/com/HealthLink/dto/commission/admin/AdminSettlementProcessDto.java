package com.HealthLink.dto.commission.admin;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminSettlementProcessDto {
    private Integer settlementId;
    private String action;
    private String notes;
}
