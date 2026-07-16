package com.HealthLink.service.notification;

import com.HealthLink.entity.enums.NotificationType;
import com.HealthLink.event.PartnerWalletBalanceChangedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/** Delivers wallet balance notifications only after the originating transaction commits. */
@Component
@RequiredArgsConstructor
public class PartnerWalletBalanceChangedEventListener {

    private final NotificationService notificationService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onWalletBalanceChanged(PartnerWalletBalanceChangedEvent event) {
        notificationService.sendWebSocketNotification(event.getUser(), NotificationType.WALLET_BALANCE_CHANGED,
                event.getTitle(), event.getMessage(), null, event.getActionUrl(), event.getMetadata());
    }
}
