package com.HealthLink.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "PharmacyConsultationRequestPrescriptions",
        uniqueConstraints = @UniqueConstraint(
                name = "UK_PharmacyRequestPrescription",
                columnNames = {"RequestID", "PrescriptionHeaderID"}
        )
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PharmacyConsultationRequestPrescription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "RequestPrescriptionID")
    private Integer requestPrescriptionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "RequestID", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private PharmacyConsultationRequest consultationRequest;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PrescriptionHeaderID", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private PrescriptionHeader prescriptionHeader;

    @Column(name = "CreatedAt", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
