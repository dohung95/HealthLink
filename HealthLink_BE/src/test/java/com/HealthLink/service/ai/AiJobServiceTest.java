package com.HealthLink.service.ai;

import com.HealthLink.entity.ai.AiJob;
import com.HealthLink.entity.ai.AiJobFailureKind;
import com.HealthLink.entity.ai.AiJobStatus;
import com.HealthLink.entity.ai.AiJobType;
import com.HealthLink.repository.ai.AiJobRepository;
import com.HealthLink.service.impl.ai.AiJobServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AiJobServiceTest {

    private static final UUID JOB_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID CORRELATION_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");

    @Mock
    private AiJobRepository jobRepository;

    private AiJobService service;

    @BeforeEach
    void setUp() {
        service = new AiJobServiceImpl(jobRepository,
                Clock.fixed(Instant.parse("2026-07-19T00:00:00Z"), ZoneOffset.UTC));
    }

    @Test
    void claimsPendingJobThenCompletesItAndKeepsRepeatedCompletionIdempotent() {
        AiJob job = pendingJob(0, 3);
        when(jobRepository.findByJobIdForUpdate(JOB_ID)).thenReturn(Optional.of(job));
        when(jobRepository.save(any(AiJob.class))).thenAnswer(invocation -> invocation.getArgument(0));

        assertThat(service.claim(JOB_ID).getStatus()).isEqualTo(AiJobStatus.RUNNING);
        assertThat(service.complete(JOB_ID).getStatus()).isEqualTo(AiJobStatus.SUCCEEDED);
        assertThat(service.complete(JOB_ID).getStatus()).isEqualTo(AiJobStatus.SUCCEEDED);

        verify(jobRepository, times(2)).save(job);
        assertThat(job.getAttemptCount()).isEqualTo(1);
    }

    @Test
    void rejectsInvalidTransitionFromPendingDirectlyToSucceeded() {
        AiJob job = pendingJob(0, 3);

        assertThatThrownBy(() -> job.succeed(java.time.LocalDateTime.now()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("PENDING")
                .hasMessageContaining("SUCCEEDED");
    }

    @Test
    void marksRetryableFailureFinalWhenMaximumAttemptsHasBeenReached() {
        AiJob job = pendingJob(2, 3);
        when(jobRepository.findByJobIdForUpdate(JOB_ID)).thenReturn(Optional.of(job));
        when(jobRepository.save(any(AiJob.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.claim(JOB_ID);
        AiJob failed = service.fail(JOB_ID, "WORKER_TIMEOUT", AiJobFailureKind.TIMEOUT);

        assertThat(failed.getStatus()).isEqualTo(AiJobStatus.FAILED_FINAL);
        assertThat(failed.getAttemptCount()).isEqualTo(3);
        assertThat(failed.getLastErrorCode()).isEqualTo("WORKER_TIMEOUT");
        assertThat(failed.getNextAttemptAt()).isNull();
    }

    @Test
    void refusesToClaimRetryableJobBeforeItsBackoffWindowExpires() {
        AiJob job = pendingJob(0, 3);
        when(jobRepository.findByJobIdForUpdate(JOB_ID)).thenReturn(Optional.of(job));
        when(jobRepository.save(any(AiJob.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.claim(JOB_ID);
        service.fail(JOB_ID, "WORKER_TIMEOUT", AiJobFailureKind.TIMEOUT);

        assertThatThrownBy(() -> service.claim(JOB_ID))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("backoff");
    }

    @Test
    void rejectsJobConfigurationAboveTheThreeAttemptSafetyLimit() {
        assertThatThrownBy(() -> pendingJob(0, 4))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("attempt");
    }

    @Test
    void producesPhiFreeWorkerPayloadWithOnlyIdsTypeAndAttemptMetadata() {
        AiJob job = pendingJob(1, 3);

        AiJobWorkerPayload payload = job.toWorkerPayload();

        assertThat(payload.jobId()).isEqualTo(JOB_ID);
        assertThat(payload.jobType()).isEqualTo(AiJobType.OCR_LAB_REPORT);
        assertThat(payload.resourceType()).isEqualTo("LAB_REPORT");
        assertThat(payload.resourceId()).isEqualTo("lab-report-42");
        assertThat(payload.correlationId()).isEqualTo(CORRELATION_ID);
        assertThat(payload.attemptCount()).isEqualTo(1);
        assertThat(payload.maxAttempts()).isEqualTo(3);
        assertThat(payload.getClass().getRecordComponents()).extracting(component -> component.getName())
                .containsExactly("jobId", "jobType", "resourceType", "resourceId", "correlationId", "attemptCount", "maxAttempts");
    }

    private AiJob pendingJob(int attempts, int maxAttempts) {
        return AiJob.pending(JOB_ID, AiJobType.OCR_LAB_REPORT, "LAB_REPORT", "lab-report-42",
                CORRELATION_ID, attempts, maxAttempts);
    }
}
