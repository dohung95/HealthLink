package com.HealthLink.dto.geocoding;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ReverseGeocodeRequest {
    @NotNull(message = "Latitude is required")
    private Double latitude;

    @NotNull(message = "Longitude is required")
    private Double longitude;
}
