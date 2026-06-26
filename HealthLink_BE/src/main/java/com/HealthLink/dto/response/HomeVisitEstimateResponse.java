package com.HealthLink.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class HomeVisitEstimateResponse {
    private Double distanceKm;
    private Integer estimatedTravelMinutes;
    private BigDecimal homeVisitFee;
    private BigDecimal travelFee;
    private BigDecimal totalFee;
    private Boolean serviceable;
    private String message;
}
