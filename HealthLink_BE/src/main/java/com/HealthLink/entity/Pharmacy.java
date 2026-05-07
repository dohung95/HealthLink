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
    
    @Column(name = "IsOpen24Hours")
    @Builder.Default
    private boolean isOpen24Hours = false;

    @Column(length = 50)
    private String workingDays;

    @Column(name = "IsVerified")
    @Builder.Default
    private boolean isVerified = false;
    
    @Column(name = "IsActive")
    @Builder.Default
    private boolean isActive = true;
    
    @Column(name = "AverageRating")
    private Double averageRating;
    
    @Column(name = "TotalReviews")
    private Integer totalReviews;

    @Column(name = "DeliveryAvailable")
    @Builder.Default
    private boolean deliveryAvailable = true;
    
    @Column(name = "DeliveryRadius")
    private Double deliveryRadius;
    
    @Column(name = "DeliveryFee")
    private BigDecimal deliveryFee;

    @Column(name = "CreatedAt")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "pharmacy")
    @ToString.Exclude
    private List<PharmacyOrder> pharmacyOrders;
}