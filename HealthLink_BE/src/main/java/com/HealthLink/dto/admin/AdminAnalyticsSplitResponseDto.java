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
public class AdminAnalyticsSplitResponseDto {
    private int year;
    private String labelA;
    private String labelB;
    private List<AdminAnalyticsSplitDataPointDto> data;
}
