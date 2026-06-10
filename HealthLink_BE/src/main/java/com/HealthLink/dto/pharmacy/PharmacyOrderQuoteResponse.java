package com.HealthLink.dto.pharmacy;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PharmacyOrderQuoteResponse {
    private Integer orderId;
    private String orderNumber;
    private List<PharmacyOrderItemResponse> items;
    private BigDecimal medicineAmount;
    private BigDecimal deliveryFee;
    private LocalDateTime estimatedDeliveryTime;
    private BigDecimal totalAmount;
    private String pharmacistNotes;
    private LocalDateTime patientConfirmedAt;
    private String paymentStatus;
}
