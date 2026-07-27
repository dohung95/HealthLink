package com.HealthLink.service.ai;

import com.HealthLink.dto.ai.RuleFinding;
import com.HealthLink.dto.ai.CdsSuggestionCreateRequest;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.User;
import com.HealthLink.entity.ai.ClinicalContextSnapshot;
import com.HealthLink.entity.ai.CdsSuggestionRun;
import com.HealthLink.integration.ai.CdsWorkerClient;
import com.HealthLink.repository.ai.CdsSuggestionRunRepository;
import com.HealthLink.repository.ai.ClinicalContextSnapshotRepository;
import com.HealthLink.utility.DoctorSecurityUtils;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import org.mockito.ArgumentCaptor;

class CdsOrchestrationServiceTest {
    @Test
    void blockingRulePersistsBlockedRunWithoutCallingWorker() {
        UUID snapshotId = UUID.randomUUID();
        Appointment appointment = Appointment.builder().appointmentId(7).doctor(Doctor.builder().doctorId("doctor-demo").build()).build();
        ClinicalContextSnapshot snapshot = ClinicalContextSnapshot.builder().snapshotId(snapshotId).appointment(appointment)
                .contextVersion(2).canonicalJson("{\"symptoms\":\"synthetic\"}").sha256("a".repeat(64))
                .createdByDoctor(appointment.getDoctor()).createdAt(Instant.now()).labReports(List.of()).build();
        ClinicalContextSnapshotRepository snapshots = mock(ClinicalContextSnapshotRepository.class);
        CdsSuggestionRunRepository runs = mock(CdsSuggestionRunRepository.class);
        CdsWorkerClient worker = mock(CdsWorkerClient.class);
        when(snapshots.findById(snapshotId)).thenReturn(Optional.of(snapshot));
        CdsOrchestrationService service = new CdsOrchestrationService(snapshots, runs, mock(DoctorSecurityUtils.class), worker,
                new ClinicalDeidentificationService(), new CdsSuggestionValidator());

        var response = service.create(7, new CdsSuggestionCreateRequest(snapshotId, 2L, List.of()),
                List.of(new RuleFinding("MISSING_SAFETY_CONTEXT", RuleFinding.Severity.BLOCKING, List.of(), "x", "x", "x", "x", "x", "rules-v1")),
                List.of(), "corpus-v1");

        assertThat(response.status()).isEqualTo("RULES_BLOCKED");
        verify(worker, never()).generate(any());
        verify(runs, times(2)).save(any());
    }

    @Test
    void emptyEvidenceCreatesLimitedDoctorReviewWithoutTreatmentOptions() {
        UUID snapshotId = UUID.randomUUID();
        Appointment appointment = Appointment.builder().appointmentId(7).doctor(Doctor.builder().doctorId("doctor-demo").build()).build();
        ClinicalContextSnapshot snapshot = ClinicalContextSnapshot.builder().snapshotId(snapshotId).appointment(appointment)
                .contextVersion(2).canonicalJson("{\"symptoms\":\"synthetic\"}").sha256("a".repeat(64))
                .createdByDoctor(appointment.getDoctor()).createdAt(Instant.now()).labReports(List.of()).build();
        ClinicalContextSnapshotRepository snapshots = mock(ClinicalContextSnapshotRepository.class);
        CdsSuggestionRunRepository runs = mock(CdsSuggestionRunRepository.class);
        when(snapshots.findById(snapshotId)).thenReturn(Optional.of(snapshot));
        CdsOrchestrationService service = new CdsOrchestrationService(snapshots, runs, mock(DoctorSecurityUtils.class), mock(CdsWorkerClient.class),
                new ClinicalDeidentificationService(), new CdsSuggestionValidator());

        var response = service.create(7, new CdsSuggestionCreateRequest(snapshotId, 2L, List.of()), List.of(), List.of(), "corpus-v1");

        assertThat(response.status()).isEqualTo("NEEDS_DOCTOR_REVIEW");
        assertThat(response.errorCode()).isEqualTo("RAG_INSUFFICIENT");
        ArgumentCaptor<com.HealthLink.entity.ai.CdsSuggestionRun> run =
                ArgumentCaptor.forClass(com.HealthLink.entity.ai.CdsSuggestionRun.class);
        verify(runs, times(3)).save(run.capture());
        assertThat(run.getValue().getValidatedOutputJson())
                .contains("\"treatmentOptionsForDoctorReview\":[]")
                .contains("\"missingInformation\":[\"RAG_INSUFFICIENT\"]");
        assertThat(run.getValue().getRuleSetVersion()).isEqualTo("student-demo-v1");
    }

    @Test
    void disabledFallbackIsAStableTerminalFailure() {
        UUID snapshotId = UUID.randomUUID();
        Appointment appointment = Appointment.builder().appointmentId(7)
                .doctor(Doctor.builder().doctorId("doctor-demo").build()).build();
        ClinicalContextSnapshot snapshot = ClinicalContextSnapshot.builder().snapshotId(snapshotId).appointment(appointment)
                .contextVersion(2).canonicalJson("{\"symptoms\":\"synthetic\"}").sha256("a".repeat(64))
                .createdByDoctor(appointment.getDoctor()).createdAt(Instant.now()).labReports(List.of()).build();
        ClinicalContextSnapshotRepository snapshots = mock(ClinicalContextSnapshotRepository.class);
        CdsSuggestionRunRepository runs = mock(CdsSuggestionRunRepository.class);
        CdsWorkerClient worker = mock(CdsWorkerClient.class);
        when(snapshots.findById(snapshotId)).thenReturn(Optional.of(snapshot));
        when(worker.generate(any())).thenThrow(new CdsWorkerClient.WorkerFailureException("FALLBACK_DISABLED", null));
        CdsOrchestrationService service = new CdsOrchestrationService(snapshots, runs,
                mock(DoctorSecurityUtils.class), worker, new ClinicalDeidentificationService(),
                new CdsSuggestionValidator());

        var response = service.create(7, new CdsSuggestionCreateRequest(snapshotId, 2L, List.of()),
                List.of(), evidence(), "corpus-v1");

        assertThat(response.status()).isEqualTo("FAILED_FINAL");
        assertThat(response.errorCode()).isEqualTo("FALLBACK_DISABLED");
    }

    @Test
    void terminalWorkerFailureKeepsItsSafeCodeForDoctorReview() {
        UUID snapshotId = UUID.randomUUID();
        Appointment appointment = Appointment.builder().appointmentId(7).doctor(Doctor.builder().doctorId("doctor-demo").build()).build();
        ClinicalContextSnapshot snapshot = ClinicalContextSnapshot.builder().snapshotId(snapshotId).appointment(appointment)
                .contextVersion(2).canonicalJson("{\"symptoms\":\"synthetic\"}").sha256("a".repeat(64))
                .createdByDoctor(appointment.getDoctor()).createdAt(Instant.now()).labReports(List.of()).build();
        ClinicalContextSnapshotRepository snapshots = mock(ClinicalContextSnapshotRepository.class);
        CdsSuggestionRunRepository runs = mock(CdsSuggestionRunRepository.class);
        CdsWorkerClient worker = mock(CdsWorkerClient.class);
        when(snapshots.findById(snapshotId)).thenReturn(Optional.of(snapshot));
        when(worker.generate(any())).thenThrow(new CdsWorkerClient.WorkerFailureException("MODEL_SCHEMA_INVALID", null));
        CdsOrchestrationService service = new CdsOrchestrationService(snapshots, runs, mock(DoctorSecurityUtils.class), worker,
                new ClinicalDeidentificationService(), new CdsSuggestionValidator());

        var response = service.create(7, new CdsSuggestionCreateRequest(snapshotId, 2L, List.of()), List.of(), evidence(), "corpus-v1");

        assertThat(response.status()).isEqualTo("FAILED_FINAL");
        assertThat(response.errorCode()).isEqualTo("MODEL_SCHEMA_INVALID");
    }

    @Test
    void sendsThePinnedCdsSchemaVersionToTheWorker() {
        UUID snapshotId = UUID.randomUUID();
        Appointment appointment = Appointment.builder().appointmentId(7).doctor(Doctor.builder().doctorId("doctor-demo").build()).build();
        ClinicalContextSnapshot snapshot = ClinicalContextSnapshot.builder().snapshotId(snapshotId).appointment(appointment)
                .contextVersion(2).canonicalJson("{\"symptoms\":\"synthetic\"}").sha256("a".repeat(64))
                .createdByDoctor(appointment.getDoctor()).createdAt(Instant.now()).labReports(List.of()).build();
        ClinicalContextSnapshotRepository snapshots = mock(ClinicalContextSnapshotRepository.class);
        CdsSuggestionRunRepository runs = mock(CdsSuggestionRunRepository.class);
        CdsWorkerClient worker = mock(CdsWorkerClient.class);
        when(snapshots.findById(snapshotId)).thenReturn(Optional.of(snapshot));
        when(worker.generate(any())).thenReturn(new CdsWorkerClient.CdsWorkerResponse("ROUTINE", "synthetic", List.of(), List.of(),
                List.of(), List.of(), List.of(), List.of(), List.of(), List.of("chunk-1"), "LOW", true));
        CdsOrchestrationService service = new CdsOrchestrationService(snapshots, runs, mock(DoctorSecurityUtils.class), worker,
                new ClinicalDeidentificationService(), new CdsSuggestionValidator());

        service.create(7, new CdsSuggestionCreateRequest(snapshotId, 2L, List.of()), List.of(), evidence(), "corpus-v1");

        ArgumentCaptor<CdsWorkerClient.CdsWorkerRequest> request = ArgumentCaptor.forClass(CdsWorkerClient.CdsWorkerRequest.class);
        verify(worker).generate(request.capture());
        assertThat(request.getValue().schemaVersion()).isEqualTo("cds-schema-v1");
        assertThat(request.getValue().promptVersion()).isEqualTo("cds-prompt-v1");
    }

    @Test
    void listsAppointmentRunsAfterCheckingAssignedDoctor() {
        UUID snapshotId = UUID.randomUUID();
        UUID runId = UUID.randomUUID();
        Appointment appointment = Appointment.builder().appointmentId(7)
                .doctor(Doctor.builder().doctorId("doctor-demo").build()).build();
        ClinicalContextSnapshot snapshot = ClinicalContextSnapshot.builder().snapshotId(snapshotId)
                .appointment(appointment).contextVersion(2).canonicalJson("{}").sha256("a".repeat(64))
                .createdByDoctor(appointment.getDoctor()).createdAt(Instant.now()).labReports(List.of()).build();
        CdsSuggestionRun run = CdsSuggestionRun.builder().runId(runId).snapshot(snapshot)
                .status("NEEDS_DOCTOR_REVIEW").ruleSetVersion("rules-v1").corpusVersion("corpus-v1")
                .promptVersion("cds-prompt-v1").modelName("qwen-demo").modelDigest("b".repeat(64))
                .createdAt(Instant.now()).build();
        CdsSuggestionRunRepository runs = mock(CdsSuggestionRunRepository.class);
        DoctorSecurityUtils security = mock(DoctorSecurityUtils.class);
        when(runs.findBySnapshot_Appointment_AppointmentIdOrderByCreatedAtDesc(7)).thenReturn(List.of(run));
        CdsOrchestrationService service = new CdsOrchestrationService(mock(ClinicalContextSnapshotRepository.class),
                runs, security, mock(CdsWorkerClient.class), new ClinicalDeidentificationService(),
                new CdsSuggestionValidator());

        var responses = service.list(7);

        assertThat(responses).extracting(response -> response.runId()).containsExactly(runId);
        verify(security).requireAssignedDoctor(appointment);
    }

    @Test
    void canonicalDetailChecksAssignedDoctorFromTheRun() {
        UUID runId = UUID.randomUUID();
        Appointment appointment = Appointment.builder().appointmentId(7)
                .doctor(Doctor.builder().doctorId("doctor-demo").build()).build();
        ClinicalContextSnapshot snapshot = ClinicalContextSnapshot.builder().snapshotId(UUID.randomUUID())
                .appointment(appointment).contextVersion(2).canonicalJson("{}").sha256("a".repeat(64))
                .createdByDoctor(appointment.getDoctor()).createdAt(Instant.now()).labReports(List.of()).build();
        CdsSuggestionRun run = CdsSuggestionRun.builder().runId(runId).snapshot(snapshot)
                .status("NEEDS_DOCTOR_REVIEW").ruleSetVersion("rules-v1").corpusVersion("corpus-v1")
                .promptVersion("cds-prompt-v1").modelName("qwen-demo").modelDigest("b".repeat(64))
                .createdAt(Instant.now()).build();
        CdsSuggestionRunRepository runs = mock(CdsSuggestionRunRepository.class);
        DoctorSecurityUtils security = mock(DoctorSecurityUtils.class);
        when(runs.findById(runId)).thenReturn(Optional.of(run));
        CdsOrchestrationService service = new CdsOrchestrationService(mock(ClinicalContextSnapshotRepository.class),
                runs, security, mock(CdsWorkerClient.class), new ClinicalDeidentificationService(),
                new CdsSuggestionValidator());

        var response = service.detail(runId);

        assertThat(response.runId()).isEqualTo(runId);
        verify(security).requireAssignedDoctor(appointment);
    }

    @Test
    void publishesAuditableLifecycleAndSupersedesOlderUnapprovedRun() {
        UUID snapshotId = UUID.randomUUID();
        User doctorUser = User.builder().id("doctor-user-demo").build();
        Doctor doctor = Doctor.builder().doctorId("doctor-demo").user(doctorUser).build();
        Appointment appointment = Appointment.builder().appointmentId(7).doctor(doctor).build();
        ClinicalContextSnapshot snapshot = ClinicalContextSnapshot.builder().snapshotId(snapshotId)
                .appointment(appointment).contextVersion(2).canonicalJson("{\"symptoms\":\"synthetic\"}")
                .sha256("a".repeat(64)).createdByDoctor(doctor).createdAt(Instant.now())
                .labReports(List.of()).build();
        CdsSuggestionRun older = CdsSuggestionRun.builder().runId(UUID.randomUUID()).snapshot(snapshot)
                .status("NEEDS_DOCTOR_REVIEW").ruleSetVersion("rules-v1").corpusVersion("corpus-v1")
                .promptVersion("cds-prompt-v1").modelName("qwen-demo").modelDigest("b".repeat(64))
                .createdAt(Instant.now()).build();
        ClinicalContextSnapshotRepository snapshots = mock(ClinicalContextSnapshotRepository.class);
        CdsSuggestionRunRepository runs = mock(CdsSuggestionRunRepository.class);
        CdsWorkerClient worker = mock(CdsWorkerClient.class);
        CdsRunStatusPublisher publisher = mock(CdsRunStatusPublisher.class);
        when(snapshots.findById(snapshotId)).thenReturn(Optional.of(snapshot));
        when(runs.findBySnapshot_Appointment_AppointmentIdAndStatusIn(eq(7), any()))
                .thenReturn(List.of(older));
        when(worker.generate(any())).thenReturn(new CdsWorkerClient.CdsWorkerResponse(
                "ROUTINE", "Synthetic doctor review.", List.of(), List.of(), List.of(), List.of(),
                List.of(), List.of(), List.of(), List.of("chunk-1"), "LOW", true));
        CdsOrchestrationService service = new CdsOrchestrationService(snapshots, runs,
                mock(DoctorSecurityUtils.class), worker, new ClinicalDeidentificationService(),
                new CdsSuggestionValidator(), publisher);

        var response = service.create(7, new CdsSuggestionCreateRequest(snapshotId, 2L, List.of()),
                List.of(), evidence(), "corpus-v1");

        assertThat(response.status()).isEqualTo("NEEDS_DOCTOR_REVIEW");
        assertThat(older.getStatus()).isEqualTo("SUPERSEDED");
        ArgumentCaptor<CdsRunStatusEvent> events = ArgumentCaptor.forClass(CdsRunStatusEvent.class);
        verify(publisher, atLeast(5)).publish(eq("doctor-user-demo"), events.capture());
        assertThat(events.getAllValues()).extracting(CdsRunStatusEvent::status)
                .containsSubsequence("SUPERSEDED", "QUEUED", "RETRIEVING", "GENERATING_LOCAL",
                        "NEEDS_DOCTOR_REVIEW");
        assertThat(events.getAllValues()).allSatisfy(event ->
                assertThat(event.getClass().getRecordComponents())
                        .extracting(java.lang.reflect.RecordComponent::getName)
                        .containsExactly("runId", "status", "errorCode"));
    }

    private static List<CdsWorkerClient.EvidenceChunk> evidence() {
        return List.of(new CdsWorkerClient.EvidenceChunk("chunk-1", "synthetic", "Synthetic guidance", "Student demo", "v1",
                "2026-01-01", "Page 1", 1, "synthetic", "a".repeat(64), "STUDENT_DEMO_ONLY", "demo"));
    }
}
