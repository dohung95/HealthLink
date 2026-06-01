package com.HealthLink.dto.commission.admin;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminPartnerCommissionDto {
    private String partnerId;
    private String partnerName;
    private String partnerType; // DOCTOR or PHARMACY
    private String avatarUrl;
    private String specialty; // For doctors
    private String location; // City/Address

    // Commission info - For Doctors (Online)
    private BigDecimal customCommissionRateOnline;
    private LocalDateTime customCommissionRateOnlineEffectiveFrom;
    private LocalDateTime customCommissionRateOnlineEffectiveTo;
    private BigDecimal effectiveCommissionRateOnline;
    private boolean usingCustomRateOnline;

    // Commission info - For Doctors (Offline)
    private BigDecimal customCommissionRateOffline;
    private LocalDateTime customCommissionRateOfflineEffectiveFrom;
    private LocalDateTime customCommissionRateOfflineEffectiveTo;
    private BigDecimal effectiveCommissionRateOffline;
    private boolean usingCustomRateOffline;

    // Commission info - For Pharmacy (single rate)
    private BigDecimal customCommissionRate;
    private LocalDateTime customCommissionRateEffectiveFrom;
    private LocalDateTime customCommissionRateEffectiveTo;
    private BigDecimal effectiveCommissionRate;
    private boolean usingCustomRate;

    // Financial summary
    private BigDecimal totalEarnings; // Total earnings after commission
    private BigDecimal pendingSettlement; // Pending amount to be paid
    private BigDecimal totalCommissionPaid; // Total commission paid to platform
    private BigDecimal totalGrossRevenue; // Total gross revenue before commission

    // Status
    private boolean verified;
    private boolean active;
    private String commissionTier;

    // Bank info
    private String bankAccount;
    private String bankName;
    private String paypalEmail;
}
