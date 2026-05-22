package com.HealthLink.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "PharmacyConsultationRequests")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PharmacyConsultationRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "RequestID")
    private Integer requestId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PatientID", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PharmacyID", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Pharmacy pharmacy;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PrescriptionHeaderID", unique = true)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private PrescriptionHeader prescriptionHeader;

    @OneToOne(mappedBy = "consultationRequest", fetch = FetchType.LAZY)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private PharmacyOrder order;

    @Column(length = 2000)
    private String symptoms;

    @Column(length = 4000)
    private String description;

    @Column(length = 1000)
    private String allergies;

    @Column(columnDefinition = "TEXT")
    private String attachments;

    @Column(length = 2000)
    private String additionalNotes;

    @Column(length = 50)
    private String preferredDeliveryType;

    @Column(length = 50, nullable = false)
    private String status;

    @Column(length = 2000)
    private String pharmacyNotes;

    @Column(length = 2000)
    private String patientFollowUpNotes;

    @Column(name = "CreatedAt", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "UpdatedAt", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
