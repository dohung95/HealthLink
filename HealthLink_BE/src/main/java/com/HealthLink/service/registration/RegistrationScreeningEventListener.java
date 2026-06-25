package com.HealthLink.service.registration;

import com.HealthLink.event.RegistrationDocumentsReadyEvent;
import com.HealthLink.service.ai.AIScreeningService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Runs AI screening for a registration AFTER the document-upload transaction has
 * committed, on a separate (async) thread and its own transaction.
 *
 * Previously screening was invoked synchronously inside the upload transaction
 * (via a self-invoked @Async method, which Spring silently ran synchronously).
 * Any failure there — e.g. a rejection reason longer than the DB column — poisoned
 * the upload transaction and surfaced to the user as HTTP 500. Decoupling it here
 * removes that failure mode and keeps the slow AI call off the request thread.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RegistrationScreeningEventListener {

    private final AIScreeningService aiScreeningService;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onDocumentsReady(RegistrationDocumentsReadyEvent event) {
        Long requestId = event.getRequestId();
        try {
            log.info("Starting AI screening for request {} (after commit)", requestId);
            aiScreeningService.screenRegistration(requestId);
            log.info("Completed AI screening for request {}", requestId);
        } catch (Exception e) {
            log.error("Error during AI screening for request {}: {}", requestId, e.getMessage(), e);
        }
    }
}
