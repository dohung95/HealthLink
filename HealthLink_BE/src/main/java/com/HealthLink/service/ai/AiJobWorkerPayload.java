package com.HealthLink.service.ai;

import com.HealthLink.entity.ai.AiJobType;

import java.util.UUID;

/**
 * The only data Spring may give an AI worker for a job.  Clinical content is
 * loaded by the worker from its authorised resource endpoint, never embedded here.
 */
public record AiJobWorkerPayload(
        UUID jobId,
        AiJobType jobType,
        String resourceType,
        String resourceId,
        UUID correlationId,
        int attemptCount,
        int maxAttempts) {
}
