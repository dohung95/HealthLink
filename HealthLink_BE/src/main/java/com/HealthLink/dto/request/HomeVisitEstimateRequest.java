package com.HealthLink.dto.request;

import lombok.Data;

@Data
public class HomeVisitEstimateRequest {
    private Double visitLatitude;
    private Double visitLongitude;
}