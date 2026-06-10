package com.HealthLink.dto.ai;

/**
 * Enum representing the AI screening status of a registration request
 */
public enum ScreeningStatus {
    /**
     * Screening has not started yet
     */
    PENDING,

    /**
     * Screening is currently in progress
     */
    PROCESSING,

    /**
     * All documents passed verification
     */
    PASSED,

    /**
     * Some documents have issues but not critical (needs manual review)
     */
    FLAGGED,

    /**
     * Documents failed verification - auto-rejected
     */
    REJECTED
}
