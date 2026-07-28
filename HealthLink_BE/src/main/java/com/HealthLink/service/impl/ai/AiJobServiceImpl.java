package com.HealthLink.service.impl.ai;

import com.HealthLink.entity.ai.AiJob;
import com.HealthLink.entity.ai.AiJobFailureKind;
import com.HealthLink.entity.ai.AiJobStatus;
import com.HealthLink.entity.ai.AiJobType;
import com.HealthLink.repository.ai.AiJobRepository;
import com.HealthLink.service.ai.AiJobService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AiJobServiceImpl implements AiJobService {

    private final AiJobRepository jobRepository;
    private final Clock clock;

    @Override
    @Transactional
    public AiJob enqueue(AiJobType jobType, String resourceType, String resourceId, UUID correlationId, int maxAttempts) {
        return jobRepository.findByJobTypeAndResourceTypeAndResourceIdAndCorrelationId(
                        jobType, resourceType, resourceId, correlationId)
                .orElseGet(() -> jobRepository.save(AiJob.pending(
                        UUID.randomUUID(), jobType, resourceType, resourceId, correlationId, 0, maxAttempts)));
    }

    @Override
    @Transactional
    public AiJob claim(UUID jobId) {
        AiJob job = jobForUpdate(jobId);
        job.claim(now());
        return jobRepository.save(job);
    }

    @Override
    @Transactional
    public AiJob complete(UUID jobId) {
        AiJob job = jobForUpdate(jobId);
        boolean alreadySucceeded = job.getStatus() == AiJobStatus.SUCCEEDED;
        job.succeed(now());
        return alreadySucceeded ? job : jobRepository.save(job);
    }

    @Override
    @Transactional
    public AiJob fail(UUID jobId, String errorCode, AiJobFailureKind failureKind) {
        AiJob job = jobForUpdate(jobId);
        job.fail(errorCode, failureKind, now());
        return jobRepository.save(job);
    }

    private AiJob jobForUpdate(UUID jobId) {
        return jobRepository.findByJobIdForUpdate(jobId)
                .orElseThrow(() -> new IllegalArgumentException("AI job not found"));
    }

    private LocalDateTime now() {
        return LocalDateTime.now(clock);
    }
}
