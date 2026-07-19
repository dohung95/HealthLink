package com.HealthLink.entity.ai;

public enum AiJobStatus {
    PENDING,
    RUNNING,
    SUCCEEDED,
    FAILED_RETRYABLE,
    FAILED_FINAL,
    CANCELLED
}
