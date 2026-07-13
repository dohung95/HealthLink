package com.HealthLink.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Nationalized;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

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

    @OneToOne(mappedBy = "consultationRequest", fetch = FetchType.LAZY)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private PharmacyOrder order;

    @OneToMany(mappedBy = "consultationRequest", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt ASC, requestPrescriptionId ASC")
    @Builder.Default
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<PharmacyConsultationRequestPrescription> requestPrescriptions = new ArrayList<>();

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

    @Column(length = 50)
    private String deliveryType;

    @Nationalized
    @Column(length = 500)
    private String deliveryAddress;

    private Double deliveryLatitude;

    private Double deliveryLongitude;

    @Column(length = 30)
    private String deliveryPhoneNumber;

    @Column(length = 50)
    private String deliveryAddressSource;

    @Column(length = 50)
    private String requestType;

    @Column(length = 50, nullable = false)
    private String status;

    @Column(length = 36)
    private String chatRoomId;

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
