package com.HealthLink.dto.payment;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class PartnerPinStatusResponse {
    boolean configured;
    boolean locked;
    LocalDateTime lockedUntil;
}
