package com.HealthLink.service.ai;

import com.HealthLink.dto.ai.CdsSuggestionCreateRequest;
import com.HealthLink.dto.ai.CdsSuggestionResponse;
import com.HealthLink.dto.ai.CdsSuggestionDetailResponse;
import com.HealthLink.dto.ai.RuleFinding;
import com.HealthLink.dto.ai.NormalizedLabObservation;
import com.HealthLink.entity.ai.CdsSuggestionRun;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.integration.ai.CdsWorkerClient;
import com.HealthLink.integration.ai.RagWorkerClient;
import com.HealthLink.repository.ai.LabObservationRepository;
import com.HealthLink.repository.ai.CdsSuggestionRunRepository;
import com.HealthLink.repository.ai.ClinicalContextSnapshotRepository;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.utility.DoctorSecurityUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.*;
import java.util.function.Supplier;

@Service
public class CdsOrchestrationService {
    private static final String MODEL = "qwen3:4b-instruct-2507-q4_K_M";
    private static final String DIGEST = "0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0";
    private static final String RULESET = "student-demo-v1";
    private final ClinicalContextSnapshotRepository snapshots; private final CdsSuggestionRunRepository runs;
    private final DoctorSecurityUtils doctorSecurity; private final CdsWorkerClient worker;
    private final ClinicalDeidentificationService deidentification; private final CdsSuggestionValidator validator;
    private LabObservationRepository observations;
    private LabNormalizationService normalization;
    private ClinicalRuleEngine rules;
    private RagWorkerClient rag;
    private AppointmentRepository appointments;
    private CdsRunStatusPublisher statusPublisher = (doctorUserId, event) -> { };
    private final ObjectMapper mapper = new ObjectMapper();
    public CdsOrchestrationService(ClinicalContextSnapshotRepository snapshots, CdsSuggestionRunRepository runs, DoctorSecurityUtils doctorSecurity,
                                   CdsWorkerClient worker, ClinicalDeidentificationService deidentification, CdsSuggestionValidator validator) {
        this.snapshots = snapshots; this.runs = runs; this.doctorSecurity = doctorSecurity; this.worker = worker; this.deidentification = deidentification; this.validator = validator;
    }
    public CdsOrchestrationService(ClinicalContextSnapshotRepository snapshots, CdsSuggestionRunRepository runs,
                                   DoctorSecurityUtils doctorSecurity, CdsWorkerClient worker,
                                   ClinicalDeidentificationService deidentification, CdsSuggestionValidator validator,
                                   CdsRunStatusPublisher statusPublisher) {
        this(snapshots, runs, doctorSecurity, worker, deidentification, validator);
        this.statusPublisher = statusPublisher;
    }
    @Autowired
    public CdsOrchestrationService(ClinicalContextSnapshotRepository snapshots, CdsSuggestionRunRepository runs, DoctorSecurityUtils doctorSecurity,
                                   CdsWorkerClient worker, ClinicalDeidentificationService deidentification, CdsSuggestionValidator validator,
                                   LabObservationRepository observations, LabNormalizationService normalization, ClinicalRuleEngine rules,
                                   RagWorkerClient rag, AppointmentRepository appointments,
                                   CdsRunStatusPublisher statusPublisher) {
        this(snapshots, runs, doctorSecurity, worker, deidentification, validator, statusPublisher);
        this.observations = observations; this.normalization = normalization; this.rules = rules; this.rag = rag;
        this.appointments = appointments;
    }
    @Transactional
    public CdsSuggestionResponse create(Integer appointmentId, CdsSuggestionCreateRequest request) {
        var snapshot = snapshots.findById(request.snapshotId()).orElseThrow(() -> new ResourceNotFoundException("ClinicalContextSnapshot", "id", request.snapshotId()));
        Map<String, Object> raw;
        try { raw = mapper.readValue(snapshot.getCanonicalJson(), Map.class); }
        catch (Exception exception) { throw new BadRequestException("Invalid clinical context snapshot"); }
        Map<String, Object> safe = deidentification.deidentify(raw);
        var normalized = snapshot.getLabReports().stream().flatMap(report -> observations.findByReport_ReportIdOrderByRowOrderAsc(report.getReportId()).stream())
                .map(normalization::normalize).toList();
        List<RuleFinding> findings = rules.evaluate(snapshot.getSnapshotId(), snapshot.getSha256(), normalized, safe);
        String retrievalQuery = new CdsRetrievalQueryBuilder().build(normalized);
        return createInternal(appointmentId, request, findings, normalized,
                () -> rag.retrieve(retrievalQuery, "student-demo-2026.1"), "student-demo-2026.1");
    }
    @Transactional
    public CdsSuggestionResponse create(Integer appointmentId, CdsSuggestionCreateRequest request, List<RuleFinding> findings,
                                        List<CdsWorkerClient.EvidenceChunk> evidence, String corpusVersion) {
        return createInternal(appointmentId, request, findings, List.of(), () -> evidence, corpusVersion);
    }
    private CdsSuggestionResponse createInternal(Integer appointmentId, CdsSuggestionCreateRequest request,
                                                 List<RuleFinding> suppliedFindings,
                                                 List<NormalizedLabObservation> normalizedLabs,
                                                 Supplier<List<CdsWorkerClient.EvidenceChunk>> evidenceSupplier,
                                                 String corpusVersion) {
        if (request == null || request.snapshotId() == null || request.expectedContextVersion() == null) throw new BadRequestException("Invalid CDS suggestion request");
        var snapshot = snapshots.findById(request.snapshotId()).orElseThrow(() -> new ResourceNotFoundException("ClinicalContextSnapshot", "id", request.snapshotId()));
        if (!Objects.equals(snapshot.getAppointment().getAppointmentId(), appointmentId) || snapshot.getContextVersion() != request.expectedContextVersion()) throw new BadRequestException("Snapshot does not match appointment context");
        doctorSecurity.requireAssignedDoctor(snapshot.getAppointment());
        if (!sameIds(request.verifiedLabReportIds(), snapshot.getLabReports().stream().map(r -> r.getReportId()).toList())) throw new BadRequestException("verifiedLabReportIds must match snapshot");
        List<RuleFinding> findings = suppliedFindings == null ? List.of() : suppliedFindings;
        String ruleset = findings.stream().findFirst().map(RuleFinding::ruleSetVersion).orElse(RULESET);
        boolean blocked = findings.stream().anyMatch(f -> f.severity() == RuleFinding.Severity.BLOCKING);
        supersedeUnapprovedRuns(appointmentId);
        CdsSuggestionRun run = CdsSuggestionRun.builder().runId(UUID.randomUUID()).snapshot(snapshot).status("QUEUED")
                .ruleSetVersion(ruleset).corpusVersion(corpusVersion).promptVersion("cds-prompt-v1")
                .modelName(MODEL).modelDigest(DIGEST).createdAt(Instant.now()).build();
        transition(run, "QUEUED", null);
        if (blocked) {
            transition(run, "RULES_BLOCKED", "RULES_BLOCKED");
            return response(run);
        }
        transition(run, "RETRIEVING", null);
        List<CdsWorkerClient.EvidenceChunk> evidence;
        try {
            evidence = evidenceSupplier.get();
        } catch (RuntimeException exception) {
            evidence = List.of();
        }
        if (evidence == null || evidence.isEmpty()) {
            try {
                run.setValidatedOutputJson(mapper.writeValueAsString(new CdsWorkerClient.CdsWorkerResponse(
                        "ROUTINE",
                        "No approved guideline evidence was retrieved; only deterministic findings are available.",
                        List.of(),
                        List.of(),
                        List.of(),
                        List.of(),
                        List.of(),
                        List.of(),
                        List.of("RAG_INSUFFICIENT"),
                        List.of(),
                        "LOW",
                        true)));
            } catch (Exception exception) {
                transition(run, "FAILED_FINAL", "MODEL_SCHEMA_INVALID");
                return response(run);
            }
            transition(run, "NEEDS_DOCTOR_REVIEW", "RAG_INSUFFICIENT");
            return response(run);
        }
        transition(run, "GENERATING_LOCAL", null);
        try {
            Map<String, Object> raw = mapper.readValue(snapshot.getCanonicalJson(), Map.class);
            var output = worker.generate(new CdsWorkerClient.CdsWorkerRequest(
                    "cds-schema-v1", run.getRunId(), run.getPromptVersion(),
                    deidentification.deidentify(raw), normalizedLabs, findings, evidence));
            validator.validate(output, evidence.stream().map(CdsWorkerClient.EvidenceChunk::evidenceId).toList(), findings);
            run.setValidatedOutputJson(mapper.writeValueAsString(output));
            transition(run, "NEEDS_DOCTOR_REVIEW", null);
        } catch (CdsWorkerClient.WorkerFailureException e) {
            String code = e.getMessage();
            transition(run, isTerminalWorkerFailure(code) ? "FAILED_FINAL" : "FAILED_RETRYABLE", code);
        } catch (CdsSuggestionValidator.ValidationException e) {
            transition(run, "FAILED_FINAL", e.getMessage().split(":")[0]);
        } catch (Exception e) {
            transition(run, "FAILED_RETRYABLE", "LOCAL_MODEL_UNAVAILABLE");
        }
        return response(run);
    }
    private void supersedeUnapprovedRuns(Integer appointmentId) {
        List<String> replaceableStatuses = List.of("QUEUED", "RETRIEVING", "GENERATING_LOCAL",
                "GENERATING_FALLBACK", "NEEDS_DOCTOR_REVIEW", "FAILED_RETRYABLE");
        for (CdsSuggestionRun older : runs.findBySnapshot_Appointment_AppointmentIdAndStatusIn(
                appointmentId, replaceableStatuses)) {
            transition(older, "SUPERSEDED", null);
        }
    }
    private void transition(CdsSuggestionRun run, String status, String errorCode) {
        run.setStatus(status);
        run.setErrorCode(errorCode);
        runs.save(run);
        var doctor = run.getSnapshot().getAppointment().getDoctor();
        if (doctor == null || doctor.getUser() == null || doctor.getUser().getId() == null
                || doctor.getUser().getId().isBlank()) {
            return;
        }
        try {
            statusPublisher.publish(doctor.getUser().getId(),
                    new CdsRunStatusEvent(run.getRunId(), status, errorCode));
        } catch (RuntimeException ignored) {
            // Realtime status is advisory and must not roll back an auditable run.
        }
    }
    private static CdsSuggestionResponse response(CdsSuggestionRun run) { return new CdsSuggestionResponse(run.getRunId(), run.getStatus(), run.getErrorCode(), run.getCreatedAt()); }
    private static boolean isTerminalWorkerFailure(String code) {
        return Set.of("CONTEXT_NOT_READY", "RAG_INSUFFICIENT", "CITATION_INVALID", "MODEL_SCHEMA_INVALID",
                "RULES_BLOCKED", "FALLBACK_DISABLED", "FALLBACK_PRIVACY_BLOCKED").contains(code);
    }
    @Transactional(readOnly = true)
    public CdsSuggestionDetailResponse detail(Integer appointmentId, UUID runId) {
        CdsSuggestionRun run = authorizedRun(runId);
        if (!Objects.equals(run.getSnapshot().getAppointment().getAppointmentId(), appointmentId)) throw new ResourceNotFoundException("CdsSuggestionRun", "id", runId);
        return detailResponse(run);
    }
    @Transactional(readOnly = true)
    public CdsSuggestionDetailResponse detail(UUID runId) {
        return detailResponse(authorizedRun(runId));
    }
    @Transactional(readOnly = true)
    public List<CdsSuggestionDetailResponse> list(Integer appointmentId) {
        List<CdsSuggestionRun> appointmentRuns =
                runs.findBySnapshot_Appointment_AppointmentIdOrderByCreatedAtDesc(appointmentId);
        if (appointments != null) {
            var appointment = appointments.findById(appointmentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Appointment", "id", appointmentId));
            doctorSecurity.requireAssignedDoctor(appointment);
        } else if (!appointmentRuns.isEmpty()) {
            doctorSecurity.requireAssignedDoctor(appointmentRuns.getFirst().getSnapshot().getAppointment());
        }
        return appointmentRuns.stream().map(this::detailResponse).toList();
    }
    private CdsSuggestionRun authorizedRun(UUID runId) {
        CdsSuggestionRun run = runs.findById(runId)
                .orElseThrow(() -> new ResourceNotFoundException("CdsSuggestionRun", "id", runId));
        doctorSecurity.requireAssignedDoctor(run.getSnapshot().getAppointment());
        return run;
    }
    private CdsSuggestionDetailResponse detailResponse(CdsSuggestionRun run) {
        return new CdsSuggestionDetailResponse(run.getRunId(), run.getSnapshot().getSnapshotId(), run.getStatus(), run.getErrorCode(),
                run.getRuleSetVersion(), run.getCorpusVersion(), run.getPromptVersion(), run.getModelName(), run.getModelDigest(),
                run.getValidatedOutputJson(), run.getCreatedAt());
    }
    private static boolean sameIds(List<UUID> supplied, List<UUID> expected) { return supplied != null && new HashSet<>(supplied).equals(new HashSet<>(expected)) && supplied.size() == expected.size(); }
}
