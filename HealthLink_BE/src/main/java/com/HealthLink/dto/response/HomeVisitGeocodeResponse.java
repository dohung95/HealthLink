package com.HealthLink.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class HomeVisitGeocodeResponse {
    private String displayName;
    private Double latitude;
    private Double longitude;
}