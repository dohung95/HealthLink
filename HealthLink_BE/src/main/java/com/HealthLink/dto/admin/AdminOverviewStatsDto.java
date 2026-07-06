package com.HealthLink.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminOverviewStatsDto {
    private long totalAppointments;
    private BigDecimal totalRevenue;
    private long totalPatients;
    private long totalDoctors;
    private long totalPharmacies;
}
