package com.HealthLink.dto.pharmacy;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class PharmacyDeliveryContactChangeResponse {
    private Integer requestId;
    private Integer orderId;
    private String status;
    private String oldDeliveryAddress;
    private Double oldDeliveryLatitude;
    private Double oldDeliveryLongitude;
    private String oldDeliveryPhoneNumber;
    private String oldDeliveryAddressSource;
    private String newDeliveryAddress;
    private Double newDeliveryLatitude;
    private Double newDeliveryLongitude;
    private String newDeliveryPhoneNumber;
    private String newDeliveryAddressSource;
    private String patientReason;
    private String pharmacyReviewNotes;
    private LocalDateTime requestedAt;
    private LocalDateTime reviewedAt;
    private BigDecimal oldDeliveryFee;
    private BigDecimal newDeliveryFee;
    private BigDecimal oldTotalAmount;
    private BigDecimal newTotalAmount;
}
