package com.HealthLink.dto.request;

import lombok.Data;

@Data
public class HomeVisitEstimateRequest {
    private String doctorId;
    private Double visitLatitude;
    private Double visitLongitude;
}