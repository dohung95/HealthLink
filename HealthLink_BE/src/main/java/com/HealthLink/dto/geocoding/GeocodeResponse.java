package com.HealthLink.dto.geocoding;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class GeocodeResponse {
    private String formattedAddress;
    private Double latitude;
    private Double longitude;
    private String provider;
}
