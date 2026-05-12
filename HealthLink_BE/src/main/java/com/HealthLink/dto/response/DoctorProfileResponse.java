package com.HealthLink.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * Response DTO đầy đủ cho trang hồ sơ Bác sĩ (Doctor Dashboard).
 * Bao gồm thông tin cá nhân, chuyên môn và theo dõi thu nhập.
 * <p>
 * ⚠️ CHỈ trả về cho chính Bác sĩ đó hoặc Admin.
 * KHÔNG dùng cho API công khai (bệnh nhân dùng DoctorResponse).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DoctorProfileResponse {

    // --- Thông tin cá nhân & chuyên môn ---
    private String doctorId;
    private String fullName;
    private String specialty;
    private String qualifications;
    private Integer yearsOfExperience;
    private String languageSpoken;
    private String location;
    private String avatarUrl;
    private String bio;
    private String clinicName;
    private String clinicAddress;
    private BigDecimal consultationFee;
    private Double averageRating;
    private Integer totalReviews;
    private boolean verified;

    /** Các loại tư vấn bác sĩ hỗ trợ: ["Video", "Audio", "Chat", "Offline"] */
    private List<String> availableTypes;

    // --- Thông tin thu nhập & chiết khấu ---
    /**
     * Tổng thu nhập tích lũy của bác sĩ (sau chiết khấu platform) (USD).
     * Hiển thị để bác sĩ theo dõi lịch sử thu nhập.
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
