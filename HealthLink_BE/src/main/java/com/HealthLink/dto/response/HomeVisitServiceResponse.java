package com.HealthLink.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class HomeVisitServiceResponse {
    private Integer serviceId;
    private String serviceName;
    private String description;
    private BigDecimal price;
    private Integer durationMinutes;
}