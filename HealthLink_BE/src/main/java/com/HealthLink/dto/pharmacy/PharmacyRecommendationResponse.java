package com.HealthLink.dto.pharmacy;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PharmacyRecommendationResponse {
    private String pharmacyId;
    private String name;
    private String address;
    private String city;
    private String district;
    private String ward;
    private String phoneNumber;
    private String email;
    private String description;
    private String avatarUrl;
    private Double latitude;
    private Double longitude;
    private LocalTime openTime;
    private LocalTime closeTime;
    private Boolean open24Hours;
    private String workingDays;
    private Double averageRating;
    private Integer totalReviews;
    private Boolean deliveryAvailable;
    private Double deliveryRadius;
    private BigDecimal deliveryFee;
    private Double distanceKm;
    private String distanceLabel;
    private Boolean withinDeliveryRadius;
    private String stockStatus;
    private List<PrescriptionStockMatchItem> availableItems;
    private List<PrescriptionStockMatchItem> missingItems;
}
