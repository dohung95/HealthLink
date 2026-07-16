package com.HealthLink.entity;

import com.HealthLink.entity.enums.PartnerWalletEntryStatus;
import com.HealthLink.entity.enums.PartnerWalletEntryType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "PartnerWalletEntries", uniqueConstraints =
        @UniqueConstraint(name = "UK_WalletEntry_Idempotency", columnNames = "IdempotencyKey"))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PartnerWalletEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "EntryId")
    private Long entryId;

    @Column(nullable = false, length = 20)
    private String partnerType;

    @Column(nullable = false, length = 450)
    private String partnerId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PartnerWalletEntryType entryType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PartnerWalletEntryStatus status;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal amount;

    private Integer commissionTransactionId;

    private Integer settlementId;

    private Integer appointmentId;

    private Integer pharmacyOrderId;

    private Integer paymentId;

    @Column(name = "IdempotencyKey", nullable = false, length = 180)
    private String idempotencyKey;

    @Column(length = 500)
    private String description;

    @Column(nullable = false)
    private LocalDateTime effectiveAt;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
