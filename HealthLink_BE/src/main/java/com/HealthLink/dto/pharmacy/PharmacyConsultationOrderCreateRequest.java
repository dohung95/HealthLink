package com.HealthLink.dto.pharmacy;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class PharmacyConsultationOrderCreateRequest {

    @NotEmpty(message = "Order must have at least 1 medication")
    @Valid
    private List<PharmacyOrderItemRequest> items;

    private String deliveryType;

    private String deliveryAddress;

    private Double deliveryLatitude;

    private Double deliveryLongitude;

    private BigDecimal deliveryFee;

    private LocalDateTime estimatedDeliveryTime;

    private String paymentMethod;

    private String notes;

    private String pharmacistNotes;
}
