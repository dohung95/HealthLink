package com.HealthLink.entity.ai;

public enum AiJobFailureKind {
    TIMEOUT(true),
    CONNECTION(true),
    RATE_LIMIT(true),
    SERVICE_UNAVAILABLE(true),
    INVALID_PAYLOAD(false);

    private final boolean retryable;

    AiJobFailureKind(boolean retryable) {
        this.retryable = retryable;
    }

    public boolean isRetryable() {
        return retryable;
    }
}
