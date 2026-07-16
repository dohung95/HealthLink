package com.HealthLink.service.payment;

import com.HealthLink.entity.Settlement;
import com.HealthLink.integration.paypal.PayPalPayoutResult;

import java.math.BigDecimal;

public interface SettlementLifecycleService {

    Settlement beginWithdrawal(String partnerType, String partnerId, String partnerName,
                               BigDecimal amount, String paypalEmail, String notes, String requestId);

    default Settlement beginWithdrawal(String partnerType, String partnerId, String partnerName,
                                       BigDecimal amount, String paypalEmail, String notes) {
        return beginWithdrawal(partnerType, partnerId, partnerName, amount, paypalEmail, notes, null);
    }

    Settlement attachPayPalBatch(Integer settlementId, PayPalPayoutResult result);

    Settlement complete(Integer settlementId, String externalStatus);

    Settlement failAndReturn(Integer settlementId, String providerStatus, String reason);
}
