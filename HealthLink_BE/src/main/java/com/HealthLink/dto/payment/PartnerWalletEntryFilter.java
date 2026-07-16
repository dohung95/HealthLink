package com.HealthLink.dto.payment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PartnerWalletEntryFilter {

    private String search;
    private String type;
    private String status;
    private LocalDate from;
    private LocalDate to;
}
