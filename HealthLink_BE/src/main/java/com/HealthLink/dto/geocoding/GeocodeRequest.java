package com.HealthLink.dto.geocoding;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class GeocodeRequest {
    @NotBlank(message = "Address is required")
    private String address;
}
