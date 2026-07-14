package com.HealthLink.dto.admin.financial;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RevenueByWeekDto {
    private int year;
    private int month;
    private List<WeeklyRevenueData> data;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WeeklyRevenueData {
        private String week; // "Week 1", "Week 2", ...
        private BigDecimal revenue;
        private long transactionCount;
    }
}
