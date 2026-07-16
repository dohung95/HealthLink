package com.HealthLink.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "CommissionTransactions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommissionTransaction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "TransactionId")
    private Integer transactionId;

    @Column(unique = true, nullable = false, length = 50)
    private String transactionNumber;  // CTX-202605-00001

    @Column(nullable = false, length = 20)
    private String sourceType;  // APPOINTMENT, PHARMACY_ORDER

    @Column(name = "AppointmentId")
    private Integer appointmentId;

    @Column(name = "PharmacyOrderId")
    private Integer pharmacyOrderId;

    @Column(nullable = false, length = 20)
    private String recipientType;  // DOCTOR, PHARMACY

    @Column(nullable = false, length = 450)
    private String recipientId;

    @Column(length = 200)
    private String recipientName;

    @Column(nullable = false, length = 50)
    private String serviceType;  // CONSULTATION_ONLINE, CONSULTATION_OFFLINE, PHARMACY_ORDER

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal grossAmount;

    @Column(nullable = false, precision = 5, scale = 4)
    private BigDecimal commissionRate;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal commissionAmount;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal netAmount;

    @Column(nullable = false, length = 50)
    @Builder.Default
    private String status = "PENDING";  // PENDING, VESTED, SETTLED, REFUNDED

    @Column(name = "VestedAt")
    private LocalDateTime vestedAt;

    @Column(name = "RefundedAt")
    private LocalDateTime refundedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "SettlementId")
    @ToString.Exclude
    private Settlement settlement;

    @Column(name = "CreatedAt")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
