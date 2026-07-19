package com.HealthLink.service.ai;

import com.HealthLink.entity.ai.AiJob;
import com.HealthLink.entity.ai.AiJobFailureKind;
import com.HealthLink.entity.ai.AiJobType;

import java.util.UUID;

public interface AiJobService {

    AiJob enqueue(AiJobType jobType, String resourceType, String resourceId, UUID correlationId, int maxAttempts);

    AiJob claim(UUID jobId);

    AiJob complete(UUID jobId);

    AiJob fail(UUID jobId, String errorCode, AiJobFailureKind failureKind);
}
