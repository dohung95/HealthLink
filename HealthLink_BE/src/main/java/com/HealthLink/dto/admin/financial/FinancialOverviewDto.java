package com.HealthLink.dto.admin.financial;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinancialOverviewDto {
    private BigDecimal totalRevenue;
    private BigDecimal platformFees;
    private BigDecimal doctorEarnings;
    private BigDecimal pharmacyEarnings;

    private BigDecimal todayRevenue;
    private BigDecimal thisWeekRevenue;
    private BigDecimal thisMonthRevenue;

    // Breakdown theo kỳ (Today / This Month) cho mini chart "Cụm A"
    private BigDecimal todayPlatformFees;
    private BigDecimal todayDoctorEarnings;
    private BigDecimal todayPharmacyEarnings;

    private BigDecimal thisMonthPlatformFees;
    private BigDecimal thisMonthDoctorEarnings;
    private BigDecimal thisMonthPharmacyEarnings;

    private long totalTransactions;
    private long completedTransactions;
    private long pendingTransactions;
    private long failedTransactions;

    private BigDecimal averageTransactionValue;

    // Growth percentages (compared to previous period)
    private Double revenueGrowthPercent;
    private Double transactionGrowthPercent;
}
