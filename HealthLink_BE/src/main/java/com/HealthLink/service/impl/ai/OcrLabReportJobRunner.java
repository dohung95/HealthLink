package com.HealthLink.service.impl.ai;

import com.HealthLink.entity.ai.AiJobStatus;
import com.HealthLink.entity.ai.AiJobType;
import com.HealthLink.repository.ai.AiJobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class OcrLabReportJobRunner {
    private final AiJobRepository jobRepository;
    private final OcrLabReportJobHandler handler;
    private final Clock clock;

    @Scheduled(fixedDelayString = "${ai.ocr.runner.fixed-delay-ms:1000}")
    public void runNextDueJob() {
        LocalDateTime now = LocalDateTime.now(clock);
        jobRepository.findDueOcrJobs(AiJobType.OCR_LAB_REPORT, AiJobStatus.PENDING,
                        AiJobStatus.FAILED_RETRYABLE, now, PageRequest.of(0, 1))
                .stream()
                .findFirst()
                .ifPresent(job -> process(job.getJobId()));
    }

    private void process(java.util.UUID jobId) {
        try {
            handler.process(jobId);
        } catch (RuntimeException exception) {
            log.warn("OCR_RUNNER_HANDLER_FAILURE jobId={}", jobId);
        }
    }
}
