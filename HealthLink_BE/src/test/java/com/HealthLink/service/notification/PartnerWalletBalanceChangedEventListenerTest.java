package com.HealthLink.service.notification;

import com.HealthLink.entity.User;
import com.HealthLink.entity.enums.NotificationType;
import com.HealthLink.event.PartnerWalletBalanceChangedEvent;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.lang.reflect.Method;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class PartnerWalletBalanceChangedEventListenerTest {

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private PartnerWalletBalanceChangedEventListener listener;

    @Test
    void sendsWalletNotificationAfterCommitThroughExistingNotificationService() throws Exception {
        User user = User.builder().id("doctor-user-1").build();
        PartnerWalletBalanceChangedEvent event = new PartnerWalletBalanceChangedEvent(user,
                "Wallet balance updated", "Withdrawal reserved", "/profile-doctor?tab=wallet",
                "{\"delta\":\"-10.00\"}");

        listener.onWalletBalanceChanged(event);

        verify(notificationService).sendWebSocketNotification(eq(user), eq(NotificationType.WALLET_BALANCE_CHANGED),
                eq("Wallet balance updated"), eq("Withdrawal reserved"), isNull(),
                eq("/profile-doctor?tab=wallet"), eq("{\"delta\":\"-10.00\"}"));
        Method handler = PartnerWalletBalanceChangedEventListener.class
                .getMethod("onWalletBalanceChanged", PartnerWalletBalanceChangedEvent.class);
        assertThat(handler.getAnnotation(TransactionalEventListener.class).phase())
                .isEqualTo(TransactionPhase.AFTER_COMMIT);
    }
}
