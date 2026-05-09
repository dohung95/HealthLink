package com.HealthLink.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminAnalyticsDataPointDto {
    private String month;  // For monthly data: "Jan", "Feb", etc.
    private String week;   // For weekly data: "Week 1", "Week 2", etc.
    private long count;
}
