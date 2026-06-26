package com.HealthLink.event;

import lombok.Getter;

/**
 * Published once a registration request has all required documents uploaded.
 * Consumed AFTER the upload transaction commits to trigger AI screening on a
 * separate thread/transaction, so screening never blocks or rolls back the upload.
 */
@Getter
public class RegistrationDocumentsReadyEvent {

    private final Long requestId;

    public RegistrationDocumentsReadyEvent(Long requestId) {
        this.requestId = requestId;
    }
}
