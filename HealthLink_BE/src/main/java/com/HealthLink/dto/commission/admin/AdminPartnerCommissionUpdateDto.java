package com.HealthLink.dto.commission.admin;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminPartnerCommissionUpdateDto {
    // For Doctors - Online rate
    private BigDecimal customCommissionRateOnline;
    private LocalDateTime effectiveFromOnline;
    private LocalDateTime effectiveToOnline;

    // For Doctors - Offline rate
    private BigDecimal customCommissionRateOffline;
    private LocalDateTime effectiveFromOffline;
    private LocalDateTime effectiveToOffline;

    // For Pharmacy - single rate (also used as fallback)
    private BigDecimal customCommissionRate;
    private LocalDateTime effectiveFrom;
    private LocalDateTime effectiveTo;
}
