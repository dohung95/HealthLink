package com.HealthLink.dto.pharmacy;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalTime;

/**
 * Request body để pharmacy update thông tin của mình.
 * Chỉ các trường được phép sửa (không bao gồm email - có flow riêng).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PharmacyUpdateRequest {

    private String phoneNumber;
    private String description;
    private String avatarUrl;
    private LocalTime openTime;
    private LocalTime closeTime;

    /** VD: "Mon-Fri", "Thứ 2 - Thứ 7" */
    private String workingDays;

    private BigDecimal deliveryFee;
    private Double deliveryRadius;
    private Boolean deliveryAvailable;
    private String paypalEmail;
}
