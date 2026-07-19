package com.HealthLink.service.ai;

import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.User;
import com.HealthLink.entity.ai.AiJobType;
import com.HealthLink.entity.ai.AiJob;
import com.HealthLink.entity.ai.AiJobFailureKind;
import com.HealthLink.entity.ai.AiJobStatus;
import com.HealthLink.entity.ai.LabObservation;
import com.HealthLink.entity.ai.LabReport;
import com.HealthLink.repository.ai.LabObservationRepository;
import com.HealthLink.repository.ai.LabReportRepository;
import com.HealthLink.service.impl.ai.OcrLabReportJobHandler;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class OcrLabReportJobHandlerTest {

    private static final UUID JOB_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID REPORT_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID CORRELATION_ID = UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final String SHA256 = "a".repeat(64);

    @Test
    void persistsWorkerCandidatesAsUnverifiedThenPublishesVerificationStatus() {
        Fixture fixture = new Fixture();
        when(fixture.dispatcher.claimForWorker(JOB_ID)).thenReturn(new AiJobWorkerPayload(
                JOB_ID, AiJobType.OCR_LAB_REPORT, "LabReport", REPORT_ID.toString(), CORRELATION_ID, 1, 3));
        when(fixture.reportRepository.findById(REPORT_ID)).thenReturn(Optional.of(fixture.report));
        when(fixture.storage.presignedGet("clinical/7/report.pdf", Duration.ofSeconds(60))).thenReturn("http://minio/grant");
        when(fixture.workerClient.extract(any())).thenReturn(successResponse());

        fixture.handler.process(JOB_ID);

        assertThat(fixture.report.getStatus()).isEqualTo(LabReport.NEEDS_VERIFICATION);
        ArgumentCaptor<Iterable<LabObservation>> observations = iterableCaptor();
        verify(fixture.observationRepository).saveAll(observations.capture());
        LabObservation observation = observations.getValue().iterator().next();
        assertThat(observation.getVerificationStatus()).isEqualTo(LabObservation.UNVERIFIED);
        assertThat(observation.getNumericValue()).isEqualByComparingTo("13.2");
        assertThat(observation.getSourceBoundingBoxJson()).contains("\"x\":0.1");
        verify(fixture.storage).presignedGet("clinical/7/report.pdf", Duration.ofSeconds(60));
        verify(fixture.observationRepository).deleteByReport_ReportIdAndVerificationStatus(REPORT_ID, LabObservation.UNVERIFIED);
        verify(fixture.jobService).complete(JOB_ID);
        verify(fixture.statusPublisher).publish("doctor-user", new LabReportStatusEvent(
                REPORT_ID, 7, LabReport.NEEDS_VERIFICATION));
    }

    @Test
    void rejectsChecksumMismatchedWorkerResponseWithoutPersistingCandidates() {
        Fixture fixture = new Fixture();
        when(fixture.dispatcher.claimForWorker(JOB_ID)).thenReturn(new AiJobWorkerPayload(
                JOB_ID, AiJobType.OCR_LAB_REPORT, "LabReport", REPORT_ID.toString(), CORRELATION_ID, 1, 3));
        when(fixture.reportRepository.findById(REPORT_ID)).thenReturn(Optional.of(fixture.report));
        when(fixture.storage.presignedGet(anyString(), any())).thenReturn("http://minio/grant");
        when(fixture.workerClient.extract(any())).thenReturn(successResponse("b".repeat(64)));

        fixture.handler.process(JOB_ID);

        assertThat(fixture.report.getStatus()).isEqualTo(LabReport.OCR_FAILED);
        verify(fixture.observationRepository, never()).saveAll(any());
        verify(fixture.jobService).fail(JOB_ID, "WORKER_INVALID_RESPONSE", com.HealthLink.entity.ai.AiJobFailureKind.INVALID_PAYLOAD);
        verify(fixture.statusPublisher).publish("doctor-user", new LabReportStatusEvent(REPORT_ID, 7, LabReport.OCR_FAILED));
    }

    @Test
    void rejectsBoundingBoxOutsideNormalizedDocumentCoordinates() {
        Fixture fixture = new Fixture();
        when(fixture.dispatcher.claimForWorker(JOB_ID)).thenReturn(ocrPayload());
        when(fixture.reportRepository.findById(REPORT_ID)).thenReturn(Optional.of(fixture.report));
        when(fixture.storage.presignedGet(anyString(), any())).thenReturn("http://minio/grant");
        when(fixture.workerClient.extract(any())).thenReturn(successResponse(SHA256,
                new OcrLabReportResponse.BoundingBox(0.8, 0.2, 0.3, 0.4)));

        fixture.handler.process(JOB_ID);

        assertThat(fixture.report.getStatus()).isEqualTo(LabReport.OCR_FAILED);
        verify(fixture.observationRepository, never()).saveAll(any());
        verify(fixture.jobService).fail(JOB_ID, "WORKER_INVALID_RESPONSE", AiJobFailureKind.INVALID_PAYLOAD);
    }

    @Test
    void keepsReportPendingWhenRetryableWorkerFailureHasAttemptsRemaining() {
        Fixture fixture = new Fixture();
        when(fixture.dispatcher.claimForWorker(JOB_ID)).thenReturn(ocrPayload());
        when(fixture.reportRepository.findById(REPORT_ID)).thenReturn(Optional.of(fixture.report));
        when(fixture.storage.presignedGet(anyString(), any())).thenReturn("http://minio/grant");
        when(fixture.workerClient.extract(any())).thenThrow(new OcrWorkerException("WORKER_CONNECTION", AiJobFailureKind.CONNECTION));
        when(fixture.jobService.fail(JOB_ID, "WORKER_CONNECTION", AiJobFailureKind.CONNECTION)).thenReturn(retryableJob());

        fixture.handler.process(JOB_ID);

        assertThat(fixture.report.getStatus()).isEqualTo(LabReport.OCR_PENDING);
        verify(fixture.statusPublisher).publish("doctor-user", new LabReportStatusEvent(REPORT_ID, 7, LabReport.OCR_PENDING));
    }

    private static OcrLabReportResponse successResponse() {
        return successResponse(SHA256, new OcrLabReportResponse.BoundingBox(0.1, 0.2, 0.3, 0.4));
    }

    private static OcrLabReportResponse successResponse(String sha256) {
        return successResponse(sha256, new OcrLabReportResponse.BoundingBox(0.1, 0.2, 0.3, 0.4));
    }

    private static OcrLabReportResponse successResponse(String sha256, OcrLabReportResponse.BoundingBox boundingBox) {
        return new OcrLabReportResponse("1.0", "paddle-test", "parser-test", sha256,
                List.of(new OcrLabReportResponse.Page(1, 1000, 1400)),
                List.of(new OcrLabReportResponse.Observation(1, "Hemoglobin", "13.2", new BigDecimal("13.2"),
                        null, "g/dL", "12-16", new BigDecimal("12"), new BigDecimal("16"), "NORMAL",
                        new BigDecimal("0.99"), 1, boundingBox,
                        LabObservation.UNVERIFIED)),
                List.of(), new OcrLabReportResponse.ProcessingMetrics(1, 1, 0));
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private static ArgumentCaptor<Iterable<LabObservation>> iterableCaptor() {
        return (ArgumentCaptor) ArgumentCaptor.forClass(Iterable.class);
    }

    private static AiJobWorkerPayload ocrPayload() {
        return new AiJobWorkerPayload(JOB_ID, AiJobType.OCR_LAB_REPORT, "LabReport", REPORT_ID.toString(), CORRELATION_ID, 1, 3);
    }

    private static AiJob retryableJob() {
        AiJob job = AiJob.pending(JOB_ID, AiJobType.OCR_LAB_REPORT, "LabReport", REPORT_ID.toString(), CORRELATION_ID, 0, 3);
        job.claim(LocalDateTime.now());
        job.fail("WORKER_CONNECTION", AiJobFailureKind.CONNECTION, LocalDateTime.now());
        assertThat(job.getStatus()).isEqualTo(AiJobStatus.FAILED_RETRYABLE);
        return job;
    }

    private static final class Fixture {
        final AiJobDispatcher dispatcher = mock(AiJobDispatcher.class);
        final AiJobService jobService = mock(AiJobService.class);
        final LabReportRepository reportRepository = mock(LabReportRepository.class);
        final LabObservationRepository observationRepository = mock(LabObservationRepository.class);
        final PrivateObjectStorageService storage = mock(PrivateObjectStorageService.class);
        final OcrWorkerClient workerClient = mock(OcrWorkerClient.class);
        final LabReportStatusPublisher statusPublisher = mock(LabReportStatusPublisher.class);
        final LabReport report = LabReport.builder().reportId(REPORT_ID).objectKey("clinical/7/report.pdf")
                .mimeType("application/pdf").sha256(SHA256).status(LabReport.UPLOADED)
                .appointment(Appointment.builder().appointmentId(7).doctor(Doctor.builder().doctorId("doctor-1")
                        .user(User.builder().id("doctor-user").build()).build()).build()).build();
        final OcrLabReportJobHandler handler = new OcrLabReportJobHandler(dispatcher, jobService, reportRepository,
                observationRepository, storage, workerClient, statusPublisher);
    }
}
