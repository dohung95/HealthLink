package com.HealthLink.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "Payments")
@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Payment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "PaymentID")
    private Integer paymentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "InvoiceID")
    @ToString.Exclude
    private Invoice invoice;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "OrderID")
    @ToString.Exclude
    private PharmacyOrder pharmacyOrder;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(length = 50)
    private String paymentMethod; // Cash, Card, Banking, EWallet

    @Column(length = 50)
    private String paymentGateway; // VNPay, Momo...

    @Column(length = 100)
    private String transactionId;

    @Column(length = 100)
    private String gatewayCaptureId;

    @Column(nullable = false, length = 50)
    private String status;

    private LocalDateTime paidAt;

    @Column(length = 500)
    private String failureReason;

    private BigDecimal refundedAmount;
    private LocalDateTime refundedAt;

    @Column(length = 500)
    private String refundReason;

    @Column(length = 2000)
    private String metadata; // JSON data from gateway

    @Column(name = "CreatedAt")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
