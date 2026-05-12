package com.HealthLink.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalTime;

/**
 * Response DTO đầy đủ cho trang hồ sơ Nhà thuốc (Pharmacy Dashboard).
 * Bao gồm thông tin hoạt động và theo dõi thu nhập/chiết khấu.
 * <p>
 * ⚠️ CHỈ trả về cho chính Nhà thuốc đó hoặc Admin.
 * KHÔNG dùng cho API công khai (bệnh nhân dùng danh sách Pharmacy).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PharmacyProfileResponse {

    // --- Thông tin cơ bản ---
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

    // --- Giờ hoạt động ---
    private LocalTime openTime;
    private LocalTime closeTime;
    private boolean open24Hours;
    private String workingDays;

    // --- Trạng thái ---
    private boolean verified;
    private boolean active;
    private Double averageRating;
    private Integer totalReviews;

    // --- Giao hàng ---
    private boolean deliveryAvailable;
    private Double deliveryRadius;
    private BigDecimal deliveryFee;

    // --- Thông tin thu nhập & chiết khấu ---
    /**
     * Tổng thu nhập tích lũy của nhà thuốc (sau chiết khấu platform) (USD).
     * Hiển thị để nhà thuốc theo dõi lịch sử thu nhập.
     */
    private BigDecimal totalEarnings;

    /**
     * Số dư thu nhập hiện tại khả dụng để rút (USD).
     * = totalEarnings - đã rút trước đó.
     */
    private BigDecimal pendingSettlement;

    /**
     * Email PayPal đã đăng ký để nhận tiền thanh toán.
     */
    private String paypalEmail;

    /** Hạng chiết khấu: STANDARD / PREMIUM / VIP */
    private String commissionTier;
}
