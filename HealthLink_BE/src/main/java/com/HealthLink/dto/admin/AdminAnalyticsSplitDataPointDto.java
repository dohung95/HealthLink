package com.HealthLink.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminAnalyticsSplitDataPointDto {
    private String month;  // "Jan", "Feb", etc.
    private long valueA;
    private long valueB;
}
