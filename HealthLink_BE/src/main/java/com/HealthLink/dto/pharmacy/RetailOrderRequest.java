package com.HealthLink.dto.pharmacy;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RetailOrderRequest {

    @NotBlank(message = "Pharmacy ID is required")
    private String pharmacyId;

    private String deliveryType;
    private String deliveryAddress;
    private Double deliveryLatitude;
    private Double deliveryLongitude;
    private String deliveryPhoneNumber;
    private String deliveryAddressSource;
    private String paymentMethod;
    private String notes;

    @NotEmpty(message = "Cart must have at least 1 item")
    @Valid
    private List<RetailCartItemRequest> items;
}
