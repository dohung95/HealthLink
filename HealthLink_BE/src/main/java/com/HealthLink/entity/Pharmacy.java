package com.HealthLink.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Entity
@Table(name = "Pharmacies")
@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Pharmacy {
    @Id
    @Column(name = "PharmacyID", length = 450)
    private String pharmacyId;

    @OneToOne
    @MapsId
    @JoinColumn(name = "PharmacyID")
    @ToString.Exclude
    private User user;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, length = 100)
    private String licenseNumber;

    @Column(nullable = false, length = 500)
    private String address;

    @Column(length = 100)
    private String city;
    @Column(length = 100)
    private String district;
    @Column(length = 100)
    private String ward;

    private Double latitude;
    private Double longitude;

    @Column(length = 20)
    private String phoneNumber;
    private String email;

    @Column(length = 1000)
    private String description;
    private String avatarUrl;

    private LocalTime openTime;
    private LocalTime closeTime;

    @Builder.Default
    private boolean Open24Hours = false;

    @Column(length = 50)
    private String workingDays;

    @Builder.Default
    private boolean Verified = false;

    @Builder.Default
    private boolean Active = true;
    private Double averageRating;
    private Integer totalReviews;

    @Builder.Default
    private boolean deliveryAvailable = true;
    private Double deliveryRadius;
    private BigDecimal deliveryFee;

    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "pharmacy")
    @ToString.Exclude
    private List<PharmacyOrder> pharmacyOrders;
}