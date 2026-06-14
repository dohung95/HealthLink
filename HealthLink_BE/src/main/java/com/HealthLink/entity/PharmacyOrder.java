package com.HealthLink.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "PharmacyOrders")
@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class PharmacyOrder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "OrderID")
    private Integer orderId;

    @Column(unique = true, length = 50)
    private String orderNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PrescriptionHeaderId")
    @ToString.Exclude
    private PrescriptionHeader prescriptionHeader;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "RequestID", unique = true)
    @ToString.Exclude
    private PharmacyConsultationRequest consultationRequest;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PharmacyId", nullable = false)
    @ToString.Exclude
    private Pharmacy pharmacy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PatientId", nullable = false)
    @ToString.Exclude
    private Patient patient;

    @Column(nullable = false, length = 50)
    private String status;

    @Column(length = 50)
    private String deliveryType;
    private String deliveryAddress;
    private Double deliveryLatitude;
    private Double deliveryLongitude;

    @Column(length = 30)
    private String deliveryPhoneNumber;

    @Column(length = 50)
    private String deliveryAddressSource;

    private BigDecimal deliveryFee;
    private BigDecimal medicineAmount;
    private BigDecimal totalAmount;

    @OneToMany(mappedBy = "pharmacyOrder", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<PharmacyOrderItem> orderItems = new ArrayList<>();

    @Column(length = 50)
    private String paymentStatus;
    @Column(length = 50)
    private String paymentMethod;

    @Column(length = 500)
    private String notes;
    @Column(length = 500)
    private String pharmacistNotes;

    private LocalDateTime estimatedDeliveryTime;
    private LocalDateTime actualDeliveryTime;
    private LocalDateTime confirmedAt;
    private LocalDateTime patientConfirmedAt;
    private LocalDateTime preparingAt;
    private LocalDateTime shippedAt;
    private LocalDateTime deliveredAt;
    private LocalDateTime cancelledAt;
    private String cancelReason;
    private String cancelledBy;
    private LocalDateTime revisionRequestedAt;
    @Column(length = 1000)
    private String revisionRequestNotes;
    private LocalDateTime revisionResolvedAt;

    @OneToOne(mappedBy = "pharmacyOrder", fetch = FetchType.LAZY)
    @ToString.Exclude
    private Invoice invoice;

    @Builder.Default
    private LocalDateTime createdAt;

    @Builder.Default
    private Boolean doctorCompletionPaidNotified = false;

    // Commission fields
    @Column(precision = 18, scale = 2)
    private BigDecimal platformFee;

    @Column(precision = 18, scale = 2)
    private BigDecimal pharmacyEarning;

    @Column(precision = 5, scale = 4)
    private BigDecimal commissionRate;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
