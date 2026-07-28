package com.HealthLink.service.ai;

import com.HealthLink.entity.ai.AiJob;
import com.HealthLink.entity.ai.AiJobStatus;
import com.HealthLink.entity.ai.AiJobType;
import com.HealthLink.repository.ai.AiJobRepository;
import com.HealthLink.service.impl.ai.OcrLabReportJobHandler;
import com.HealthLink.service.impl.ai.OcrLabReportJobRunner;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.slf4j.LoggerFactory;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OcrLabReportJobRunnerTest {

    @Mock
    private AiJobRepository jobRepository;
    @Mock
    private OcrLabReportJobHandler handler;

    private final Clock clock = Clock.fixed(Instant.parse("2026-07-22T00:00:00Z"), ZoneOffset.UTC);
    private OcrLabReportJobRunner runner;

    @BeforeEach
    void setUp() {
        runner = new OcrLabReportJobRunner(jobRepository, handler, clock);
    }

    @Test
    void dispatchesExactlyOneDueOcrJob() {
        UUID jobId = UUID.randomUUID();
        AiJob job = pendingJob(jobId);
        when(jobRepository.findDueOcrJobs(eq(AiJobType.OCR_LAB_REPORT), eq(AiJobStatus.PENDING),
                eq(AiJobStatus.FAILED_RETRYABLE), eq(now()), any(Pageable.class))).thenReturn(List.of(job));

        runner.runNextDueJob();

        verify(handler).process(jobId);
        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(jobRepository).findDueOcrJobs(eq(AiJobType.OCR_LAB_REPORT), eq(AiJobStatus.PENDING),
                eq(AiJobStatus.FAILED_RETRYABLE), eq(now()), pageable.capture());
        assertEquals(0, pageable.getValue().getPageNumber());
        assertEquals(1, pageable.getValue().getPageSize());
    }

    @Test
    void skipsHandlerWhenNoDueOcrJobExists() {
        when(jobRepository.findDueOcrJobs(any(), any(), any(), any(), any())).thenReturn(List.of());

        runner.runNextDueJob();

        verifyNoInteractions(handler);
    }

    @Test
    void continuesPollingAfterUnexpectedHandlerFailure() {
        UUID jobId = UUID.randomUUID();
        when(jobRepository.findDueOcrJobs(any(), any(), any(), any(), any())).thenReturn(List.of(pendingJob(jobId)));
        doThrow(new IllegalStateException("do-not-log-OCR-text")).doNothing().when(handler).process(jobId);
        Logger logger = (Logger) LoggerFactory.getLogger(OcrLabReportJobRunner.class);
        ListAppender<ILoggingEvent> events = new ListAppender<>();
        logger.addAppender(events);
        events.start();

        try {
            runner.runNextDueJob();
            runner.runNextDueJob();
        } finally {
            logger.detachAppender(events);
            events.stop();
        }

        verify(handler, times(2)).process(jobId);
        assertEquals(1, events.list.size());
        assertEquals("OCR_RUNNER_HANDLER_FAILURE jobId=" + jobId, events.list.getFirst().getFormattedMessage());
        assertEquals(null, events.list.getFirst().getThrowableProxy());
    }

    private AiJob pendingJob(UUID jobId) {
        return AiJob.pending(jobId, AiJobType.OCR_LAB_REPORT, "LabReport", UUID.randomUUID().toString(),
                UUID.randomUUID(), 0, 3);
    }

    private LocalDateTime now() {
        return LocalDateTime.ofInstant(clock.instant(), clock.getZone());
    }
}
