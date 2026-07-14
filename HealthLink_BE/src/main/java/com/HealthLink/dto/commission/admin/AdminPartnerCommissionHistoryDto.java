package com.HealthLink.dto.commission.admin;

import lombok.*;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminPartnerCommissionHistoryDto {
    private String partnerId;
    private String partnerType;
    private List<AdminYearlyCommissionDto> yearlyBreakdown;
    private List<AdminMonthlyCommissionDto> monthlyBreakdown;
}
