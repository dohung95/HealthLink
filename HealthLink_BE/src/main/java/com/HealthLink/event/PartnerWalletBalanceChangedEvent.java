package com.HealthLink.event;

import com.HealthLink.entity.User;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Published by a committed wallet balance transition for best-effort realtime delivery. */
@Getter
@RequiredArgsConstructor
public class PartnerWalletBalanceChangedEvent {

    private final User user;
    private final String title;
    private final String message;
    private final String actionUrl;
    private final String metadata;
}
