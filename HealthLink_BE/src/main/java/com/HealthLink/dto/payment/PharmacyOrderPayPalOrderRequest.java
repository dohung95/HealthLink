package com.HealthLink.dto.payment;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PharmacyOrderPayPalOrderRequest {

    @NotNull(message = "pharmacyOrderId is required")
    private Integer pharmacyOrderId;

    private String currency = "USD";
}
