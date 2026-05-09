package com.HealthLink.dto.pharmacy;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class PharmacyOrderResponse {

    private Integer orderId;

    /** Mã đơn hàng, format: ORD-YYYYMMDD-XXXX */
    private String orderNumber;

    // --- Prescription info ---
    private Integer prescriptionHeaderId;
    private String diagnosis;

    // --- Pharmacy info ---
    private String pharmacyId;
    private String pharmacyName;
    private String pharmacyPhone;

    // --- Patient info ---
    private String patientId;
    private String patientName;

    // --- Order details ---
    private String status;
    private String deliveryType;
    private String deliveryAddress;
    private Double deliveryLatitude;
    private Double deliveryLongitude;

    // --- Amounts (BigDecimal for precision) ---
    private BigDecimal medicineAmount;
    private BigDecimal deliveryFee;
    private BigDecimal totalAmount;

    // --- Payment ---
    private String paymentStatus;
    private String paymentMethod;

    // --- Notes ---
    private String notes;
    private String pharmacistNotes;

    // --- Timestamps ---
    private LocalDateTime estimatedDeliveryTime;
    private LocalDateTime actualDeliveryTime;
    private LocalDateTime confirmedAt;
    private LocalDateTime preparingAt;
    private LocalDateTime shippedAt;
    private LocalDateTime deliveredAt;
    private LocalDateTime cancelledAt;
    private String cancelReason;
    private LocalDateTime createdAt;
}
