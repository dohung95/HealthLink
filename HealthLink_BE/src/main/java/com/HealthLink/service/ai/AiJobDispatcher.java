package com.HealthLink.service.ai;

import com.HealthLink.entity.ai.AiJob;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.UUID;

/** Entry point for a scheduler or message consumer to atomically claim a job. */
@Component
@RequiredArgsConstructor
public class AiJobDispatcher {

    private final AiJobService aiJobService;

    public AiJobWorkerPayload claimForWorker(UUID jobId) {
        AiJob job = aiJobService.claim(jobId);
        return job.toWorkerPayload();
    }
}
