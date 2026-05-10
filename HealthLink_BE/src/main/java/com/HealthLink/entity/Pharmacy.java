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
    @JoinColumn(name = "PharmacyID", referencedColumnName = "Id", insertable = false, updatable = false)
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
    
    @Column(name = "Open24Hours")
    @Builder.Default
    private boolean open24Hours = false;

    @Column(length = 50)
    private String workingDays;

    @Column(name = "Verified")
    @Builder.Default
    private boolean verified = false;
    
    @Column(name = "Active")
    @Builder.Default
    private boolean active = true;
    
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

    // Commission fields
    @Column(precision = 5, scale = 4)
    private BigDecimal customCommissionRate;

    @Column(length = 20)
    @Builder.Default
    private String commissionTier = "STANDARD";  // STANDARD, PREMIUM, VIP

    @Column(precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal totalEarnings = BigDecimal.ZERO;

    @Column(precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal pendingSettlement = BigDecimal.ZERO;

    @Column(length = 50)
    private String bankAccount;

    @Column(length = 100)
    private String bankName;

    @Column(length = 255)
    private String paypalEmail;

    @OneToMany(mappedBy = "pharmacy")
    @ToString.Exclude
    private List<PharmacyOrder> pharmacyOrders;
}