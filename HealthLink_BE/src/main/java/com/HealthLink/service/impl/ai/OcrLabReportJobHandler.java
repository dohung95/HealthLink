package com.HealthLink.service.impl.ai;

import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.ai.AiJob;
import com.HealthLink.entity.ai.AiJobFailureKind;
import com.HealthLink.entity.ai.AiJobStatus;
import com.HealthLink.entity.ai.AiJobType;
import com.HealthLink.entity.ai.LabObservation;
import com.HealthLink.entity.ai.LabReport;
import com.HealthLink.repository.ai.LabObservationRepository;
import com.HealthLink.repository.ai.LabReportRepository;
import com.HealthLink.service.ai.AiJobDispatcher;
import com.HealthLink.service.ai.AiJobService;
import com.HealthLink.service.ai.AiJobWorkerPayload;
import com.HealthLink.service.ai.LabReportStatusEvent;
import com.HealthLink.service.ai.LabReportStatusPublisher;
import com.HealthLink.service.ai.OcrLabReportRequest;
import com.HealthLink.service.ai.OcrLabReportResponse;
import com.HealthLink.service.ai.OcrWorkerClient;
import com.HealthLink.service.ai.OcrWorkerException;
import com.HealthLink.service.ai.PrivateObjectStorageService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

@Service
public class OcrLabReportJobHandler {
    private static final Duration GRANT_EXPIRY = Duration.ofSeconds(60);
    private static final String SCHEMA_VERSION = "1.0";

    private final AiJobDispatcher dispatcher;
    private final AiJobService jobService;
    private final LabReportRepository reportRepository;
    private final LabObservationRepository observationRepository;
    private final PrivateObjectStorageService storage;
    private final OcrWorkerClient workerClient;
    private final LabReportStatusPublisher statusPublisher;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public OcrLabReportJobHandler(AiJobDispatcher dispatcher, AiJobService jobService,
                                  LabReportRepository reportRepository, LabObservationRepository observationRepository,
                                  PrivateObjectStorageService storage, OcrWorkerClient workerClient,
                                  LabReportStatusPublisher statusPublisher) {
        this.dispatcher = dispatcher;
        this.jobService = jobService;
        this.reportRepository = reportRepository;
        this.observationRepository = observationRepository;
        this.storage = storage;
        this.workerClient = workerClient;
        this.statusPublisher = statusPublisher;
    }

    @Transactional
    public void process(UUID jobId) {
        AiJobWorkerPayload payload = dispatcher.claimForWorker(jobId);
        if (payload.jobType() != AiJobType.OCR_LAB_REPORT || !"LabReport".equals(payload.resourceType())) {
            jobService.fail(jobId, "WORKER_INVALID_JOB", AiJobFailureKind.INVALID_PAYLOAD);
            return;
        }
        LabReport report = reportRepository.findById(UUID.fromString(payload.resourceId()))
                .orElseThrow(() -> new IllegalArgumentException("Lab report not found"));
        try {
            report.setStatus(LabReport.OCR_RUNNING);
            reportRepository.save(report);
            publish(report);
            String grant = storage.presignedGet(report.getObjectKey(), GRANT_EXPIRY);
            OcrLabReportResponse response = workerClient.extract(new OcrLabReportRequest(payload.jobId(), report.getReportId(),
                    grant, report.getMimeType(), report.getSha256(), payload.correlationId()));
            validate(response, report);
            observationRepository.deleteByReport_ReportIdAndVerificationStatus(report.getReportId(), LabObservation.UNVERIFIED);
            observationRepository.saveAll(response.observations().stream().map(candidate -> toObservation(report, candidate)).toList());
            report.setStatus(LabReport.NEEDS_VERIFICATION);
            reportRepository.save(report);
            jobService.complete(jobId);
            publish(report);
        } catch (OcrWorkerException exception) {
            fail(report, jobId, exception.errorCode(), exception.failureKind());
        } catch (RuntimeException exception) {
            fail(report, jobId, "WORKER_INVALID_RESPONSE", AiJobFailureKind.INVALID_PAYLOAD);
        }
    }

    private void validate(OcrLabReportResponse response, LabReport report) {
        if (response == null || !SCHEMA_VERSION.equals(response.schemaVersion()) || !report.getSha256().equals(response.sha256())
                || response.observations() == null) {
            throw new OcrWorkerException("WORKER_INVALID_RESPONSE", AiJobFailureKind.INVALID_PAYLOAD);
        }
    }

    private LabObservation toObservation(LabReport report, OcrLabReportResponse.Observation candidate) {
        if (candidate == null || candidate.testNameRaw() == null || candidate.valueText() == null
                || !isNormalized(candidate.sourceBoundingBox())) {
            throw new OcrWorkerException("WORKER_INVALID_RESPONSE", AiJobFailureKind.INVALID_PAYLOAD);
        }
        try {
            return LabObservation.builder().observationId(UUID.randomUUID()).report(report).rowOrder(candidate.rowOrder())
                    .testNameRaw(candidate.testNameRaw()).valueText(candidate.valueText()).numericValue(candidate.numericValue())
                    .comparator(candidate.comparator()).unitRaw(candidate.unitRaw()).referenceText(candidate.referenceText())
                    .referenceLow(candidate.referenceLow()).referenceHigh(candidate.referenceHigh())
                    .abnormalFlag(candidate.abnormalFlag()).ocrConfidence(candidate.confidence()).sourcePage(candidate.sourcePage())
                    .sourceBoundingBoxJson(objectMapper.writeValueAsString(candidate.sourceBoundingBox()))
                    .verificationStatus(LabObservation.UNVERIFIED).doctorCorrected(false).build();
        } catch (JsonProcessingException exception) {
            throw new OcrWorkerException("WORKER_INVALID_RESPONSE", AiJobFailureKind.INVALID_PAYLOAD);
        }
    }

    private boolean isNormalized(OcrLabReportResponse.BoundingBox box) {
        return Double.isFinite(box.x()) && Double.isFinite(box.y()) && Double.isFinite(box.width()) && Double.isFinite(box.height())
                && box.x() >= 0 && box.y() >= 0 && box.width() >= 0 && box.height() >= 0
                && box.x() + box.width() <= 1 && box.y() + box.height() <= 1;
    }

    private void fail(LabReport report, UUID jobId, String errorCode, AiJobFailureKind failureKind) {
        AiJob failedJob = jobService.fail(jobId, errorCode, failureKind);
        report.setStatus(failedJob != null && failedJob.getStatus() == AiJobStatus.FAILED_RETRYABLE
                ? LabReport.OCR_PENDING : LabReport.OCR_FAILED);
        reportRepository.save(report);
        publish(report);
    }

    private void publish(LabReport report) {
        Doctor doctor = report.getAppointment().getDoctor();
        if (doctor == null || doctor.getUser() == null || doctor.getUser().getId() == null) {
            return;
        }
        try {
            statusPublisher.publish(doctor.getUser().getId(), new LabReportStatusEvent(report.getReportId(),
                    report.getAppointment().getAppointmentId(), report.getStatus()));
        } catch (RuntimeException ignored) {
            // Status delivery is advisory and contains no OCR text or object grant.
        }
    }
}
