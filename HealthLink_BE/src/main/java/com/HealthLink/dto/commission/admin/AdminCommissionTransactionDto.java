package com.HealthLink.dto.commission.admin;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminCommissionTransactionDto {
    private Integer transactionId;
    private String transactionNumber;
    private String sourceType;
    private Integer sourceId;
    private String recipientType;
    private String recipientId;
    private String recipientName;
    private String serviceType;
    private BigDecimal grossAmount;
    private BigDecimal commissionRate;
    private BigDecimal commissionAmount;
    private BigDecimal netAmount;
    private String status;
    private Integer settlementId;
    private String settlementNumber;
    private LocalDateTime createdAt;

    // Patient info (from Appointment or PharmacyOrder)
    private String patientId;
    private String patientName;

    // Appointment status (for display)
    private String appointmentStatus;
}
