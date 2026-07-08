package com.HealthLink.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Nationalized;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "PharmacyDeliveryContactChangeRequests")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PharmacyDeliveryContactChangeRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "RequestID")
    private Integer requestId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "OrderID", nullable = false)
    @ToString.Exclude
    private PharmacyOrder order;

    @Column(name = "Status", nullable = false, length = 30)
    @Builder.Default
    private String status = "PENDING";

    @Nationalized
    @Column(name = "OldDeliveryAddress", length = 500)
    private String oldDeliveryAddress;

    @Column(name = "OldDeliveryLatitude")
    private Double oldDeliveryLatitude;

    @Column(name = "OldDeliveryLongitude")
    private Double oldDeliveryLongitude;

    @Column(name = "OldDeliveryPhoneNumber", length = 30)
    private String oldDeliveryPhoneNumber;

    @Column(name = "OldDeliveryAddressSource", length = 50)
    private String oldDeliveryAddressSource;

    @Nationalized
    @Column(name = "NewDeliveryAddress", nullable = false, length = 500)
    private String newDeliveryAddress;

    @Column(name = "NewDeliveryLatitude")
    private Double newDeliveryLatitude;

    @Column(name = "NewDeliveryLongitude")
    private Double newDeliveryLongitude;

    @Column(name = "NewDeliveryPhoneNumber", nullable = false, length = 30)
    private String newDeliveryPhoneNumber;

    @Column(name = "NewDeliveryAddressSource", length = 50)
    private String newDeliveryAddressSource;

    @Column(name = "PatientReason", length = 500)
    private String patientReason;

    @Column(name = "PharmacyReviewNotes", length = 500)
    private String pharmacyReviewNotes;

    @Column(name = "RequestedAt", nullable = false)
    private LocalDateTime requestedAt;

    @Column(name = "ReviewedAt")
    private LocalDateTime reviewedAt;

    @Column(name = "OldDeliveryFee", precision = 18, scale = 2)
    private BigDecimal oldDeliveryFee;

    @Column(name = "NewDeliveryFee", precision = 18, scale = 2)
    private BigDecimal newDeliveryFee;

    @Column(name = "OldTotalAmount", precision = 18, scale = 2)
    private BigDecimal oldTotalAmount;

    @Column(name = "NewTotalAmount", precision = 18, scale = 2)
    private BigDecimal newTotalAmount;

    @Column(name = "CreatedAt", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "UpdatedAt")
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
        if (requestedAt == null) requestedAt = now;
        if (status == null) status = "PENDING";
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
