package com.HealthLink.dto.payment;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PharmacyOrderPayPalCaptureRequest {

    @NotBlank(message = "orderId is required")
    private String orderId;

    @NotNull(message = "pharmacyOrderId is required")
    private Integer pharmacyOrderId;

    private String paymentMethod = "EWallet";
}
