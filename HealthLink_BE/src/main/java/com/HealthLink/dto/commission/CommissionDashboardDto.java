package com.HealthLink.dto.commission;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommissionDashboardDto {
    private BigDecimal totalGrossRevenue;
    private BigDecimal totalCommission;
    private BigDecimal totalPaidOut;
    private BigDecimal totalPending;
    private BigDecimal doctorGross;
    private BigDecimal doctorCommission;
    private BigDecimal pharmacyGross;
    private BigDecimal pharmacyCommission;
    private Integer totalTransactions;
    private Integer pendingTransactions;
    private Integer pendingSettlements;
    private List<RecipientSummaryDto> topDoctorsPending;
    private List<RecipientSummaryDto> topPharmaciesPending;
    private List<MonthlyCommissionDto> monthlyData;
}
