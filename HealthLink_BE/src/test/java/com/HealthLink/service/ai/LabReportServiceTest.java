package com.HealthLink.service.ai;

import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.User;
import com.HealthLink.dto.ai.CreateLabReportResponse;
import com.HealthLink.service.impl.ai.LabReportServiceImpl;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import com.HealthLink.entity.ai.AiJob;
import com.HealthLink.entity.ai.AiJobType;
import com.HealthLink.entity.ai.LabReport;
import com.HealthLink.entity.ai.LabReportUploadIdempotency;
import com.HealthLink.repository.ai.LabReportRepository;
import com.HealthLink.repository.ai.LabReportUploadIdempotencyRepository;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.utility.DoctorSecurityUtils;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.file.Path;
import java.io.ByteArrayOutputStream;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class LabReportServiceTest {

    @TempDir
    Path temporaryDirectory;

    @Test
    void rejectsExecutableRenamedAsPdfBeforeStorage() {
        Fixture fixture = new Fixture();
        MockMultipartFile file = new MockMultipartFile("file", "looks-safe.pdf", "application/pdf", "MZ executable".getBytes());

        assertThatThrownBy(() -> fixture.service.upload(7, file, null, null, "retry-1"))
                .hasMessageContaining("PDF, JPEG, or PNG");

        verifyNoInteractions(fixture.storage);
    }

    @Test
    void storesValidatedPdfWithPrivateKeyAndEnqueuesOcrJob() {
        Fixture fixture = new Fixture();
        MockMultipartFile file = new MockMultipartFile("file", "patient-name.pdf", "application/pdf",
                validPdf());
        AiJob job = AiJob.pending(UUID.randomUUID(), AiJobType.OCR_LAB_REPORT, "LabReport", "placeholder",
                UUID.randomUUID(), 0, 3);
        when(fixture.jobService.enqueue(eq(AiJobType.OCR_LAB_REPORT), eq("LabReport"), anyString(), any(UUID.class), eq(3)))
                .thenReturn(job);

        CreateLabReportResponse response = fixture.service.upload(7, file, null, "Synthetic lab", "retry-2");

        assertThat(response.status()).isEqualTo(LabReport.UPLOADED);
        assertThat(response.reportId()).isNotNull();
        assertThat(response.jobId()).isEqualTo(job.getJobId());
        ArgumentCaptor<String> key = ArgumentCaptor.forClass(String.class);
        verify(fixture.storage).store(key.capture(), any(Path.class), anyLong(), eq("application/pdf"));
        assertThat(key.getValue()).matches("clinical/7/" + response.reportId() + "/[0-9a-f-]+\\.pdf");
        assertThat(key.getValue()).doesNotContain("patient-name");
        verify(fixture.jobService).enqueue(eq(AiJobType.OCR_LAB_REPORT), eq("LabReport"),
                eq(response.reportId().toString()), any(UUID.class), eq(3));
        verify(fixture.statusPublisher).publish("user-1", new LabReportStatusEvent(response.reportId(), 7, LabReport.UPLOADED));
    }

    private byte[] validPdf() {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            document.addPage(new PDPage());
            document.save(output);
            return output.toByteArray();
        } catch (Exception exception) {
            throw new AssertionError(exception);
        }
    }

    @Test
    void replaysSameIdempotencyKeyWithoutCallingStorage() {
        Fixture fixture = new Fixture();
        UUID reportId = UUID.randomUUID();
        UUID jobId = UUID.randomUUID();
        LabReport report = LabReport.builder().reportId(reportId).status(LabReport.UPLOADED).build();
        LabReportUploadIdempotency replay = LabReportUploadIdempotency.completed(7, "doctor-1", "retry-3", reportId, jobId);
        when(fixture.idempotencyRepository.findByAppointmentIdAndDoctorIdAndIdempotencyKey(7, "doctor-1", "retry-3"))
                .thenReturn(Optional.of(replay));
        when(fixture.reportRepository.findById(reportId)).thenReturn(Optional.of(report));
        MockMultipartFile file = new MockMultipartFile("file", "ignored.pdf", "application/pdf", new byte[0]);

        CreateLabReportResponse response = fixture.service.upload(7, file, null, null, "retry-3");

        assertThat(response.reportId()).isEqualTo(reportId);
        assertThat(response.jobId()).isEqualTo(jobId);
        verifyNoInteractions(fixture.storage);
        verifyNoInteractions(fixture.statusPublisher);
    }

    @Test
    void doesNotFailPersistedUploadWhenStatusDeliveryFails() {
        Fixture fixture = new Fixture();
        MockMultipartFile file = new MockMultipartFile("file", "synthetic.pdf", "application/pdf", validPdf());
        AiJob job = AiJob.pending(UUID.randomUUID(), AiJobType.OCR_LAB_REPORT, "LabReport", "placeholder",
                UUID.randomUUID(), 0, 3);
        when(fixture.jobService.enqueue(any(), anyString(), anyString(), any(), anyInt())).thenReturn(job);
        doThrow(new RuntimeException("broker unavailable")).when(fixture.statusPublisher).publish(anyString(), any());

        CreateLabReportResponse response = fixture.service.upload(7, file, null, null, "retry-event-failure");

        assertThat(response.reportId()).isNotNull();
        verify(fixture.idempotencyRepository).save(any(LabReportUploadIdempotency.class));
    }

    @Test
    void authorizesAssignedDoctorBeforeAnyStorageCall() {
        Fixture fixture = new Fixture();
        doThrow(new com.HealthLink.exception.UnauthorizedAccessException("Access denied"))
                .when(fixture.doctorSecurity).requireAssignedDoctor(fixture.appointment);
        MockMultipartFile file = new MockMultipartFile("file", "valid.pdf", "application/pdf", "%PDF-1.4\n%%EOF".getBytes());

        assertThatThrownBy(() -> fixture.service.upload(7, file, null, null, "retry-4"))
                .hasMessage("Access denied");

        verifyNoInteractions(fixture.storage);
    }

    private final class Fixture {
        final AppointmentRepository appointmentRepository = mock(AppointmentRepository.class);
        final LabReportRepository reportRepository = mock(LabReportRepository.class);
        final LabReportUploadIdempotencyRepository idempotencyRepository = mock(LabReportUploadIdempotencyRepository.class);
        final DoctorSecurityUtils doctorSecurity = mock(DoctorSecurityUtils.class);
        final PrivateObjectStorageService storage = mock(PrivateObjectStorageService.class);
        final AiJobService jobService = mock(AiJobService.class);
        final LabReportStatusPublisher statusPublisher = mock(LabReportStatusPublisher.class);
        final Appointment appointment = Appointment.builder().appointmentId(7)
                .doctor(Doctor.builder().doctorId("doctor-1").user(User.builder().id("user-1").build()).build()).build();
        final LabReportService service = new LabReportServiceImpl(appointmentRepository, reportRepository, idempotencyRepository,
                doctorSecurity, storage, jobService, statusPublisher, temporaryDirectory.toString());

        Fixture() {
            when(appointmentRepository.findById(7)).thenReturn(Optional.of(appointment));
            when(reportRepository.save(any(LabReport.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(idempotencyRepository.save(any(LabReportUploadIdempotency.class))).thenAnswer(invocation -> invocation.getArgument(0));
        }
    }
}
