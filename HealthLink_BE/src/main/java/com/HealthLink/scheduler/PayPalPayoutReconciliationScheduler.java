package com.HealthLink.scheduler;

import com.HealthLink.entity.Settlement;
import com.HealthLink.integration.paypal.PayPalPayoutClient;
import com.HealthLink.integration.paypal.PayPalPayoutResult;
import com.HealthLink.repository.payment.PaymentSettlementRepository;
import com.HealthLink.service.payment.SettlementLifecycleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Locale;

@Component
@Slf4j
@RequiredArgsConstructor
public class PayPalPayoutReconciliationScheduler {

    private final PaymentSettlementRepository settlementRepository;
    private final PayPalPayoutClient payPalPayoutClient;
    private final SettlementLifecycleService lifecycleService;

    @Scheduled(fixedDelayString = "${wallet.paypal-reconciliation-ms:60000}")
    public void reconcile() {
        for (Settlement settlement : settlementRepository
                .findTop100ByStatusAndPayoutBatchIdIsNotNullOrderByCreatedAtAsc("PROCESSING")) {
            reconcile(settlement);
        }
    }

    private void reconcile(Settlement settlement) {
        try {
            PayPalPayoutResult result = payPalPayoutClient.getPayoutBatch(settlement.getPayoutBatchId());
            if (result == null) {
                log.warn("PayPal payout reconciliation returned no result for settlementNumber={}, payoutBatchId={}",
                        settlement.getSettlementNumber(), settlement.getPayoutBatchId());
                return;
            }

            String providerStatus = statusOf(result);
            String newStatus = switch (providerStatus) {
                case "SUCCESS" -> {
                    lifecycleService.complete(settlement.getSettlementId(), providerStatus);
                    yield "COMPLETED";
                }
                case "DENIED", "CANCELED", "CANCELLED" -> {
                    String reason = result.getMessage() == null
                            ? "PayPal payout " + providerStatus
                            : result.getMessage();
                    lifecycleService.failAndReturn(settlement.getSettlementId(), providerStatus, reason);
                    yield "FAILED";
                }
                default -> {
                    lifecycleService.attachPayPalBatch(settlement.getSettlementId(), resultWithBatchId(settlement, result));
                    yield settlement.getStatus();
                }
            };
            log.info("Reconciled PayPal payout settlementNumber={}, payoutBatchId={}, oldStatus={}, newStatus={}",
                    settlement.getSettlementNumber(), settlement.getPayoutBatchId(), settlement.getStatus(), newStatus);
        } catch (Exception ex) {
            log.warn("Unable to reconcile PayPal payout settlementNumber={}, payoutBatchId={}",
                    settlement.getSettlementNumber(), settlement.getPayoutBatchId(), ex);
        }
    }

    private String statusOf(PayPalPayoutResult result) {
        return result.getStatus() == null ? "UNKNOWN" : result.getStatus().toUpperCase(Locale.ROOT);
    }

    private PayPalPayoutResult resultWithBatchId(Settlement settlement, PayPalPayoutResult result) {
        if (result.getPayoutBatchId() != null && !result.getPayoutBatchId().isBlank()) {
            return result;
        }
        return PayPalPayoutResult.builder()
                .payoutBatchId(settlement.getPayoutBatchId())
                .status(result.getStatus())
                .message(result.getMessage())
                .build();
    }
}
