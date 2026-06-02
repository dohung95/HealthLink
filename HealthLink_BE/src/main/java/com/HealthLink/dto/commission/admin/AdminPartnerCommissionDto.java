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

    // Appointment breakdown by status and type (for Doctors)
    // Online consultations
    private BigDecimal onlinePendingAmount;
    private Integer onlinePendingCount;
    private BigDecimal onlineCompletedAmount;
    private Integer onlineCompletedCount;
    private BigDecimal onlineCancelledAmount;
    private Integer onlineCancelledCount;

    // Offline consultations
    private BigDecimal offlinePendingAmount;
    private Integer offlinePendingCount;
    private BigDecimal offlineCompletedAmount;
    private Integer offlineCompletedCount;
    private BigDecimal offlineCancelledAmount;
    private Integer offlineCancelledCount;

    // Pharmacy order breakdown (for Pharmacy)
    private BigDecimal pharmacyPendingAmount;
    private Integer pharmacyPendingCount;
    private BigDecimal pharmacyCompletedAmount;
    private Integer pharmacyCompletedCount;
    private BigDecimal pharmacyCancelledAmount;
    private Integer pharmacyCancelledCount;

    // Status
    private boolean verified;
    private boolean active;
    private String commissionTier;

    // Bank info
    private String bankAccount;
    private String bankName;
    private String paypalEmail;
}
