package com.HealthLink.dto.payment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PartnerWalletEntryResponse {

    private Long entryId;
    private String entryType;
    private String status;
    private BigDecimal amount;
    private String description;
    private Integer appointmentId;
    private Integer pharmacyOrderId;
    private BigDecimal grossAmount;
    private BigDecimal commissionAmount;
    private Integer settlementId;
    private String settlementNumber;
    private String paypalEmail;
    private LocalDateTime effectiveAt;
    private LocalDateTime updatedAt;
}
