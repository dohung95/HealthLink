package com.HealthLink.entity.ai;

import com.HealthLink.service.ai.AiJobWorkerPayload;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "AiJobs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class AiJob {

    private static final Duration[] RETRY_DELAYS = {
            Duration.ofSeconds(5), Duration.ofSeconds(30), Duration.ofSeconds(120)
    };

    @Id
    @Column(name = "JobID", nullable = false, updatable = false)
    private UUID jobId;

    @Enumerated(EnumType.STRING)
    @Column(name = "JobType", nullable = false, length = 64)
    private AiJobType jobType;

    @Column(name = "ResourceType", nullable = false, length = 64)
    private String resourceType;

    @Column(name = "ResourceID", nullable = false, length = 100)
    private String resourceId;

    @Enumerated(EnumType.STRING)
    @Column(name = "Status", nullable = false, length = 32)
    private AiJobStatus status;

    @Column(name = "AttemptCount", nullable = false)
    private int attemptCount;

    @Column(name = "MaxAttempts", nullable = false)
    private int maxAttempts;

    @Column(name = "CorrelationID", nullable = false, updatable = false)
    private UUID correlationId;

    @Column(name = "LastErrorCode", length = 80)
    private String lastErrorCode;

    @Column(name = "CreatedAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "StartedAt")
    private LocalDateTime startedAt;

    @Column(name = "FinishedAt")
    private LocalDateTime finishedAt;

    @Column(name = "NextAttemptAt")
    private LocalDateTime nextAttemptAt;

    @Version
    @Column(name = "RowVersion", nullable = false)
    private long rowVersion;

    public static AiJob pending(UUID jobId, AiJobType jobType, String resourceType, String resourceId,
                                UUID correlationId, int attemptCount, int maxAttempts) {
        if (jobId == null || jobType == null || isBlank(resourceType) || isBlank(resourceId) || correlationId == null) {
            throw new IllegalArgumentException("AI job requires identifiers, type, and correlation ID");
        }
        if (maxAttempts < 1 || maxAttempts > 3 || attemptCount < 0 || attemptCount > maxAttempts) {
            throw new IllegalArgumentException("AI job attempt counts are invalid");
        }
        return new AiJob(jobId, jobType, resourceType, resourceId, AiJobStatus.PENDING,
                attemptCount, maxAttempts, correlationId, null, LocalDateTime.now(), null, null, null, 0L);
    }

    public void claim(LocalDateTime now) {
        requireStatus(AiJobStatus.RUNNING, AiJobStatus.PENDING, AiJobStatus.FAILED_RETRYABLE);
        if (status == AiJobStatus.FAILED_RETRYABLE && nextAttemptAt != null && now.isBefore(nextAttemptAt)) {
            throw new IllegalStateException("AI job retry backoff has not elapsed");
        }
        if (attemptCount >= maxAttempts) {
            throw new IllegalStateException("AI job has reached its maximum attempts");
        }
        status = AiJobStatus.RUNNING;
        attemptCount++;
        startedAt = now;
        finishedAt = null;
        nextAttemptAt = null;
    }

    public void succeed(LocalDateTime now) {
        if (status == AiJobStatus.SUCCEEDED) {
            return;
        }
        requireStatus(AiJobStatus.SUCCEEDED, AiJobStatus.RUNNING);
        status = AiJobStatus.SUCCEEDED;
        finishedAt = now;
        nextAttemptAt = null;
        lastErrorCode = null;
    }

    public void fail(String errorCode, AiJobFailureKind failureKind, LocalDateTime now) {
        requireStatus(AiJobStatus.FAILED_FINAL, AiJobStatus.RUNNING);
        if (failureKind == null) {
            throw new IllegalArgumentException("AI job failure kind is required");
        }
        lastErrorCode = stableErrorCode(errorCode);
        finishedAt = now;
        if (failureKind.isRetryable() && attemptCount < maxAttempts) {
            status = AiJobStatus.FAILED_RETRYABLE;
            nextAttemptAt = now.plus(retryDelay(attemptCount));
            return;
        }
        status = AiJobStatus.FAILED_FINAL;
        nextAttemptAt = null;
    }

    public AiJobWorkerPayload toWorkerPayload() {
        return new AiJobWorkerPayload(jobId, jobType, resourceType, resourceId, correlationId, attemptCount, maxAttempts);
    }

    private Duration retryDelay(int currentAttempt) {
        return RETRY_DELAYS[Math.min(Math.max(currentAttempt, 1), RETRY_DELAYS.length) - 1];
    }

    private void requireStatus(AiJobStatus target, AiJobStatus... allowed) {
        for (AiJobStatus candidate : allowed) {
            if (status == candidate) {
                return;
            }
        }
        throw new IllegalStateException("Invalid AI job transition from " + status + " to " + target);
    }

    private static String stableErrorCode(String errorCode) {
        if (errorCode == null || !errorCode.matches("[A-Z0-9_]{1,80}")) {
            throw new IllegalArgumentException("AI job error code must be a stable uppercase code");
        }
        return errorCode;
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
