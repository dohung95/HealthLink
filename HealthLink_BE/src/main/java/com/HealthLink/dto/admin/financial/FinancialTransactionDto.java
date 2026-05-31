package com.HealthLink.dto.admin.financial;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinancialTransactionDto {
    private Integer transactionId;
    private String transactionType; // APPOINTMENT, PHARMACY_ORDER
    private String referenceId; // AppointmentID or OrderID

    private String patientName;
    private String patientId;

    private String providerName; // Doctor or Pharmacy name
    private String providerId;
    private String providerType; // DOCTOR, PHARMACY

    private BigDecimal amount;
    private BigDecimal platformFee;
    private BigDecimal providerEarning;
    private BigDecimal commissionRate;

    private String paymentMethod;
    private String paymentGateway;
    private String externalTransactionId;

    private String status; // PENDING, COMPLETED, FAILED, REFUNDED
    private LocalDateTime createdAt;
    private LocalDateTime paidAt;

    private String description;
}
