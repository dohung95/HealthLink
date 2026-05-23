package com.HealthLink.dto.pharmacy;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class PharmacyConsultationOrderCreateRequest {

    @NotNull(message = "Medicine amount is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Medicine amount must be greater than or equal to 0")
    private BigDecimal medicineAmount;

    private String deliveryType;

    private String deliveryAddress;

    private Double deliveryLatitude;

    private Double deliveryLongitude;

    private String paymentMethod;

    private String notes;

    private String pharmacistNotes;
}
