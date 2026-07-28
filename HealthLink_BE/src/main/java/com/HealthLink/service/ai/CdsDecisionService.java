package com.HealthLink.service.ai;

import com.HealthLink.dto.ai.CdsAuditEventResponse;
import com.HealthLink.dto.ai.CdsDecisionResponse;
import com.HealthLink.dto.ai.SubmitCdsDecisionRequest;
import com.HealthLink.entity.ai.CdsDecision;
import com.HealthLink.entity.ai.CdsSuggestionRun;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.CdsDecisionConflictException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.exception.StaleCdsDecisionVersionException;
import com.HealthLink.exception.StaleClinicalContextVersionException;
import com.HealthLink.repository.ai.CdsDecisionRepository;
import com.HealthLink.repository.ai.CdsSuggestionRunRepository;
import com.HealthLink.utility.DoctorSecurityUtils;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
public class CdsDecisionService {
    public static final Set<String> EDITABLE_FIELDS = Set.of(
            "clinicalSummary",
            "possibleExplanations",
            "differentialDiagnoses",
            "recommendedAdditionalTests",
            "treatmentOptionsForDoctorReview",
            "drugWarnings",
            "missingInformation");
    private static final Set<String> DECISIONS = Set.of(
            "APPROVED_AS_IS", "APPROVED_WITH_EDITS", "REJECTED");

    private final CdsSuggestionRunRepository runs;
    private final CdsDecisionRepository decisions;
    private final DoctorSecurityUtils security;
    private final CdsAuditTrailService audit;
    private final ObjectMapper mapper;
    private final ClinicalContextService clinicalContext;

    public CdsDecisionService(CdsSuggestionRunRepository runs, CdsDecisionRepository decisions,
                              DoctorSecurityUtils security, CdsAuditTrailService audit,
                              ObjectMapper mapper, ClinicalContextService clinicalContext) {
        this.runs = runs;
        this.decisions = decisions;
        this.security = security;
        this.audit = audit;
        this.mapper = mapper.copy().enable(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS);
        this.clinicalContext = clinicalContext;
    }

    @Transactional
    public CdsDecisionResponse submit(UUID runId, SubmitCdsDecisionRequest request) {
        requireRequest(request);
        CdsSuggestionRun run = authorizedRunForDecision(runId);
        if (!clinicalContext.isSnapshotCurrent(run.getSnapshot())) {
            throw new StaleClinicalContextVersionException();
        }
        if (!"NEEDS_DOCTOR_REVIEW".equals(run.getStatus())) {
            throw new BadRequestException("CDS suggestion is not awaiting Doctor review");
        }
        Optional<CdsDecision> existing = decisions.findByRun_RunId(runId);
        if (existing.isPresent()) {
            if (existing.get().getVersion() != request.expectedVersion()) {
                throw new StaleCdsDecisionVersionException();
            }
            throw new CdsDecisionConflictException("A final Doctor decision already exists for this CDS run");
        }
        if (request.expectedVersion() != 0L) {
            throw new StaleCdsDecisionVersionException();
        }

        String status = normalized(request.decision());
        if (!DECISIONS.contains(status)) {
            throw new BadRequestException("Unsupported CDS decision");
        }
        Map<String, Object> edits = request.editedContent() == null
                ? Map.of()
                : request.editedContent();
        String reason = trim(request.reason());
        if (("REJECTED".equals(status) || "APPROVED_WITH_EDITS".equals(status))
                && reason == null) {
            throw new BadRequestException("A Doctor reason is required for this decision");
        }
        if ("APPROVED_AS_IS".equals(status) && !edits.isEmpty()) {
            throw new BadRequestException("Approve as-is cannot contain edited content");
        }
        if ("APPROVED_WITH_EDITS".equals(status) && edits.isEmpty()) {
            throw new BadRequestException("Approve with edits requires edited content");
        }
        if ("REJECTED".equals(status) && !edits.isEmpty()) {
            throw new BadRequestException("Rejected suggestions cannot contain edited content");
        }

        Map<String, Object> original = parse(run.getValidatedOutputJson());
        String originalJson = write(original);
        String editedJson = null;
        String editedHash = null;
        List<String> changedFields = List.of();
        if (!edits.isEmpty()) {
            validateEdits(edits);
            Map<String, Object> merged = new TreeMap<>(original);
            edits.forEach(merged::put);
            editedJson = write(merged);
            editedHash = CdsAuditTrailService.hash(editedJson);
            changedFields = edits.keySet().stream().sorted().toList();
        }

        CdsDecision decision = decisions.saveAndFlush(CdsDecision.builder()
                .decisionId(UUID.randomUUID())
                .run(run)
                .doctorId(run.getSnapshot().getAppointment().getDoctor().getDoctorId())
                .decisionStatus(status)
                .originalOutputHash(CdsAuditTrailService.hash(originalJson))
                .editedOutputJson(editedJson)
                .editedOutputHash(editedHash)
                .reason(reason)
                .decidedAt(Instant.now())
                .applyStatus("NOT_APPLIED")
                .version(0L)
                .build());
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("decisionStatus", status);
        metadata.put("originalOutputHash", decision.getOriginalOutputHash());
        metadata.put("editedOutputHash", decision.getEditedOutputHash());
        metadata.put("changedFields", changedFields);
        metadata.put("modelDigest", run.getModelDigest());
        metadata.put("ruleSetVersion", run.getRuleSetVersion());
        metadata.put("corpusVersion", run.getCorpusVersion());
        metadata.put("promptVersion", run.getPromptVersion());
        metadata.put("decisionVersion", decision.getVersion());
        audit.append(run, decision, "DECISION_" + status, metadata);
        return response(decision);
    }

    @Transactional(readOnly = true)
    public Optional<CdsDecisionResponse> detail(UUID runId) {
        CdsSuggestionRun run = authorizedRun(runId);
        return decisions.findByRun_RunId(run.getRunId()).map(CdsDecisionService::response);
    }

    @Transactional(readOnly = true)
    public List<CdsAuditEventResponse> audit(UUID runId) {
        CdsSuggestionRun run = authorizedRun(runId);
        return audit.timeline(run.getRunId());
    }

    private CdsSuggestionRun authorizedRunForDecision(UUID runId) {
        CdsSuggestionRun run = runs.findByIdForDecision(runId)
                .orElseThrow(() -> new ResourceNotFoundException("CdsSuggestionRun", "id", runId));
        security.requireAssignedDoctor(run.getSnapshot().getAppointment());
        return run;
    }

    private CdsSuggestionRun authorizedRun(UUID runId) {
        CdsSuggestionRun run = runs.findById(runId)
                .orElseThrow(() -> new ResourceNotFoundException("CdsSuggestionRun", "id", runId));
        security.requireAssignedDoctor(run.getSnapshot().getAppointment());
        return run;
    }

    private void requireRequest(SubmitCdsDecisionRequest request) {
        if (request == null || request.expectedVersion() == null || request.expectedVersion() < 0) {
            throw new BadRequestException("expectedVersion is required and must be non-negative");
        }
    }

    private void validateEdits(Map<String, Object> edits) {
        if (!EDITABLE_FIELDS.containsAll(edits.keySet())) {
            throw new BadRequestException("Edited CDS content contains a read-only or unsupported field");
        }
        edits.forEach((field, value) -> {
            if ("clinicalSummary".equals(field)) {
                if (!(value instanceof String text) || text.isBlank() || text.length() > 8000) {
                    throw new BadRequestException("clinicalSummary edit must be nonblank text");
                }
                return;
            }
            if (!(value instanceof List<?> list) || list.size() > 100
                    || list.stream().anyMatch(item -> !(item instanceof String text)
                    || text.isBlank() || text.length() > 2000)) {
                throw new BadRequestException(field + " edit must be a list of nonblank text values");
            }
        });
    }

    private Map<String, Object> parse(String json) {
        if (json == null || json.isBlank()) {
            throw new BadRequestException("CDS suggestion has no validated output");
        }
        try {
            return mapper.readValue(json, new TypeReference<>() { });
        } catch (Exception exception) {
            throw new BadRequestException("CDS suggestion output is invalid");
        }
    }

    private String write(Object value) {
        try {
            return mapper.writeValueAsString(value);
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to serialize CDS decision", exception);
        }
    }

    static CdsDecisionResponse response(CdsDecision decision) {
        return new CdsDecisionResponse(
                decision.getDecisionId(),
                decision.getRun().getRunId(),
                decision.getDecisionStatus(),
                decision.getOriginalOutputHash(),
                decision.getEditedOutputJson(),
                decision.getEditedOutputHash(),
                decision.getReason(),
                decision.getDecidedAt(),
                decision.getApplyStatus(),
                decision.getAppliedAt(),
                decision.getTargetMedicalDocumentId(),
                decision.getBeforeHash(),
                decision.getAfterHash(),
                decision.getVersion());
    }

    private static String normalized(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private static String trim(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
