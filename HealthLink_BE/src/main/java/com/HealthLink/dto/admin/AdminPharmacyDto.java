package com.HealthLink.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminPharmacyDto {
    private String pharmacyId;
    private String name;
    private String licenseNumber;
    private String address;
    private String city;
    private String district;
    private String ward;
    private Double latitude;
    private Double longitude;
    private String phoneNumber;
    private String email;
    private String description;
    private String avatarUrl;
    private LocalTime openTime;
    private LocalTime closeTime;
    private boolean open24Hours;
    private String workingDays;
    private boolean verified;
    private boolean active;
    private boolean deliveryAvailable;
    private Double deliveryRadius;
    private BigDecimal deliveryFee;
    private Double averageRating;
    private Integer totalReviews;
    private BigDecimal totalEarnings;
    private BigDecimal pendingSettlement;
    private String bankAccount;
    private String bankName;
    private String paypalEmail;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
