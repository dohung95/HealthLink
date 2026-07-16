package com.HealthLink.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "Settlements")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Settlement {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "SettlementId")
    private Integer settlementId;

    @Column(unique = true, nullable = false, length = 50)
    private String settlementNumber;  // STL-202605-00001

    @Column(nullable = false, length = 20)
    private String recipientType;  // DOCTOR, PHARMACY

    @Column(nullable = false, length = 450)
    private String recipientId;

    @Column(length = 200)
    private String recipientName;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal grossAmount;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal commissionAmount;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal netAmount;

    @Builder.Default
    private Integer transactionCount = 0;

    @Column(nullable = false, length = 50)
    @Builder.Default
    private String status = "PENDING";  // PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED

    @Column(length = 50)
    private String paymentMethod;  // BANK_TRANSFER, PAYPAL

    @Column(length = 50)
    private String bankAccount;

    @Column(length = 100)
    private String bankName;

    @Column(length = 255)
    private String paypalEmail;

    private LocalDateTime periodStart;

    private LocalDateTime periodEnd;

    private LocalDateTime processedAt;

    @Column(length = 450)
    private String processedBy;

    private LocalDateTime completedAt;

    @Column(length = 500)
    private String notes;

    @Column(name = "payout_batch_id", unique = true, length = 255)
    private String payoutBatchId;

    @Column(name = "external_status", length = 50)
    private String externalStatus;

    @Column(name = "last_reconciled_at")
    private LocalDateTime lastReconciledAt;

    @Column(name = "client_request_id", length = 100)
    private String clientRequestId;

    /** True only for the in-memory settlement that this call reserved and may submit to PayPal. */
    @Transient
    private boolean payoutSubmissionRequired;

    @Column(name = "CreatedAt")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "settlement")
    @ToString.Exclude
    private List<CommissionTransaction> transactions;
}
