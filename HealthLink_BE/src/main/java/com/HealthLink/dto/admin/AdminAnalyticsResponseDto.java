package com.HealthLink.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminAnalyticsResponseDto {
    private int year;
    private int month;  // Optional, for weekly data
    private List<AdminAnalyticsDataPointDto> data;
}
