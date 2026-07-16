package com.HealthLink.integration.paypal;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class PayPalPayoutResult {
    String payoutBatchId;
    String status;
    String message;
}
