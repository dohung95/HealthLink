package com.HealthLink.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PharmacyDemandAnalyticsResponse {
    private List<MedicineDemandItem> topMedicines;
    private List<DemandTrendPoint> trend;
    private String aiSummary;
    private int totalOrders;
    private BigDecimal totalRevenue;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MedicineDemandItem {
        private String medicineName;
        private int soldQuantity;
        private int orderCount;
        private BigDecimal revenue;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DemandTrendPoint {
        private LocalDate date;
        private int orderCount;
        private BigDecimal revenue;
    }
}
