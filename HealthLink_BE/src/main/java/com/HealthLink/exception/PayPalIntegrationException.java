package com.HealthLink.exception;

public class PayPalIntegrationException extends RuntimeException {
    public PayPalIntegrationException(String message) {
        super(message);
    }

    public PayPalIntegrationException(String message, Throwable cause) {
        super(message, cause);
    }
}
