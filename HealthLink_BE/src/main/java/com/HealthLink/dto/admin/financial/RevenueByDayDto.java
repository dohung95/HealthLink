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
public class RevenueByDayDto {
    private int year;
    private int month;
    private List<DailyRevenueData> data;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyRevenueData {
        private String date; // "01", "02", ... "31" or "May 01"
        private BigDecimal revenue;
        private long transactionCount;
    }
}
