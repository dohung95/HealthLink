package com.HealthLink.dto.pharmacy;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PharmacyDeliveryContactUpdateRequest {
    @NotBlank
    private String deliveryAddress;
    private Double deliveryLatitude;
    private Double deliveryLongitude;
    @NotBlank
    private String deliveryPhoneNumber;
    private String deliveryAddressSource;
    private String reason;
}
