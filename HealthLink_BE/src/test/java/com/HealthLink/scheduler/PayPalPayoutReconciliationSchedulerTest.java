package com.HealthLink.scheduler;

import com.HealthLink.entity.Settlement;
import com.HealthLink.integration.paypal.PayPalPayoutClient;
import com.HealthLink.integration.paypal.PayPalPayoutResult;
import com.HealthLink.repository.payment.PaymentSettlementRepository;
import com.HealthLink.service.payment.SettlementLifecycleService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PayPalPayoutReconciliationSchedulerTest {

    @Mock
    private PaymentSettlementRepository settlementRepository;

    @Mock
    private PayPalPayoutClient payPalPayoutClient;

    @Mock
    private SettlementLifecycleService lifecycleService;

    @InjectMocks
    private PayPalPayoutReconciliationScheduler scheduler;

    @Test
    void reconcile_completesFailsAndKeepsProcessingPayoutsInOneBatch() {
        Settlement successful = processingSettlement(1, "STL-success", "batch-success");
        Settlement denied = processingSettlement(2, "STL-denied", "batch-denied");
        Settlement pending = processingSettlement(3, "STL-pending", "batch-pending");
        when(settlementRepository.findTop100ByStatusAndPayoutBatchIdIsNotNullOrderByCreatedAtAsc("PROCESSING"))
                .thenReturn(List.of(successful, denied, pending));
        when(payPalPayoutClient.getPayoutBatch("batch-success"))
                .thenReturn(result("batch-success", "SUCCESS", null));
        when(payPalPayoutClient.getPayoutBatch("batch-denied"))
                .thenReturn(result("batch-denied", "DENIED", "recipient rejected payout"));
        when(payPalPayoutClient.getPayoutBatch("batch-pending"))
                .thenReturn(result("batch-pending", "PENDING", null));

        scheduler.reconcile();

        verify(lifecycleService).complete(1, "SUCCESS");
        verify(lifecycleService).failAndReturn(2, "DENIED", "recipient rejected payout");
        verify(lifecycleService).attachPayPalBatch(3, result("batch-pending", "PENDING", null));
        verify(lifecycleService, never()).failAndReturn(eq(3), any(), any());
    }

    @Test
    void reconcile_doesNotReturnBalanceForUnknownProviderStatus() {
        Settlement unknown = processingSettlement(4, "STL-unknown", "batch-unknown");
        when(settlementRepository.findTop100ByStatusAndPayoutBatchIdIsNotNullOrderByCreatedAtAsc("PROCESSING"))
                .thenReturn(List.of(unknown));
        PayPalPayoutResult unknownResult = result("batch-unknown", "UNKNOWN", "PayPal did not provide a status");
        when(payPalPayoutClient.getPayoutBatch("batch-unknown")).thenReturn(unknownResult);

        scheduler.reconcile();

        verify(lifecycleService).attachPayPalBatch(4, unknownResult);
        verify(lifecycleService, never()).complete(eq(4), any());
        verify(lifecycleService, never()).failAndReturn(eq(4), any(), any());
    }

    @Test
    void reconcile_preservesBatchIdWhenAnUnknownResponseDoesNotIncludeOne() {
        Settlement unknown = processingSettlement(4, "STL-unknown", "batch-unknown");
        when(settlementRepository.findTop100ByStatusAndPayoutBatchIdIsNotNullOrderByCreatedAtAsc("PROCESSING"))
                .thenReturn(List.of(unknown));
        PayPalPayoutResult unknownResult = result(null, "UNKNOWN", "PayPal did not include a batch header");
        when(payPalPayoutClient.getPayoutBatch("batch-unknown")).thenReturn(unknownResult);

        scheduler.reconcile();

        verify(lifecycleService).attachPayPalBatch(4,
                result("batch-unknown", "UNKNOWN", "PayPal did not include a batch header"));
        verify(lifecycleService, never()).failAndReturn(eq(4), any(), any());
    }

    @Test
    void reconcile_continuesWhenOnePayoutLookupFails() {
        Settlement unavailable = processingSettlement(5, "STL-unavailable", "batch-unavailable");
        Settlement successful = processingSettlement(6, "STL-success", "batch-success");
        when(settlementRepository.findTop100ByStatusAndPayoutBatchIdIsNotNullOrderByCreatedAtAsc("PROCESSING"))
                .thenReturn(List.of(unavailable, successful));
        when(payPalPayoutClient.getPayoutBatch("batch-unavailable")).thenThrow(new RuntimeException("PayPal unavailable"));
        when(payPalPayoutClient.getPayoutBatch("batch-success"))
                .thenReturn(result("batch-success", "SUCCESS", null));

        scheduler.reconcile();

        verify(lifecycleService).complete(6, "SUCCESS");
        verify(lifecycleService, never()).complete(eq(5), any());
        verify(lifecycleService, never()).failAndReturn(eq(5), any(), any());
    }

    private Settlement processingSettlement(Integer id, String number, String batchId) {
        return Settlement.builder()
                .settlementId(id)
                .settlementNumber(number)
                .status("PROCESSING")
                .payoutBatchId(batchId)
                .build();
    }

    private PayPalPayoutResult result(String batchId, String status, String message) {
        return PayPalPayoutResult.builder()
                .payoutBatchId(batchId)
                .status(status)
                .message(message)
                .build();
    }
}
