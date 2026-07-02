package com.HealthLink.dto.pharmacy;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * Response DTO chứa thông tin profile của Pharmacy.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PharmacyProfileResponse {

    // Thông tin cơ bản
    private String pharmacyId;
    private String name;
    private String email;
    private String phoneNumber;
    private String avatarUrl;
    private String description;

    // Địa điểm
    private String address;
    private String city;
    private String district;
    private String ward;
    private Double latitude;
    private Double longitude;

    // Giờ hoạt động
    private LocalTime openTime;
    private LocalTime closeTime;
    private boolean open24Hours;
    private String workingDays;

    // Giao hàng
    private boolean deliveryAvailable;
    private BigDecimal deliveryFee;
    private Double deliveryRadius;

    // Trạng thái & đánh giá
    private boolean verified;
    private boolean active;
    private boolean isOnline;
    private Double averageRating;
    private Integer totalReviews;

    // Tài chính
    private BigDecimal totalEarnings;
    private BigDecimal pendingSettlement;
    private String commissionTier;
    private String paypalEmail;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @JsonProperty("isOnline")
    public boolean isOnline() {
        return isOnline;
    }

    @JsonProperty("isOnline")
    public void setOnline(boolean online) {
        this.isOnline = online;
    }
}
