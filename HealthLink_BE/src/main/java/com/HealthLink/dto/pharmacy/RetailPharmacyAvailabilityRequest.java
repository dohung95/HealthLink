package com.HealthLink.dto.pharmacy;

import jakarta.validation.Valid;
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
public class RetailPharmacyAvailabilityRequest {

    private Double lat;
    private Double lng;
    private Boolean deliveryOnly;
    private String fulfillmentType;

    @NotEmpty(message = "Cart must have at least 1 item")
    @Valid
    private List<RetailCartItemRequest> items;
}
