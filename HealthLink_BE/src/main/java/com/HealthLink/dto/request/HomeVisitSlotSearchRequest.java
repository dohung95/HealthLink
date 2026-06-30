package com.HealthLink.dto.request;

import lombok.Data;

import java.util.List;

@Data
public class HomeVisitSlotSearchRequest {
    private Double visitLatitude;
    private Double visitLongitude;
    private List<Integer> homeVisitServiceIds;
}