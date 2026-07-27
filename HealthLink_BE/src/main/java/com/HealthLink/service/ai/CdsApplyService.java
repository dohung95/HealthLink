package com.HealthLink.service.ai;

import com.HealthLink.dto.ai.ApplyCdsDecisionRequest;
import com.HealthLink.dto.ai.CdsDecisionResponse;
import com.HealthLink.dto.request.healthrecord.ClinicalResultUpsertRequest;
import com.HealthLink.dto.response.healthrecord.MedicalDocumentResponse;
import com.HealthLink.entity.ai.CdsDecision;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.CdsDecisionConflictException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.exception.StaleCdsDecisionVersionException;
import com.HealthLink.repository.ai.CdsDecisionRepository;
import com.HealthLink.service.healthrecord.DoctorClinicalResultService;
import com.HealthLink.utility.DoctorSecurityUtils;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
public class CdsApplyService {
    private final CdsDecisionRepository decisions;
    private final DoctorSecurityUtils security;
    private final DoctorClinicalResultService clinicalResults;
    private final CdsAuditTrailService audit;
    private final CdsApplyFailureRecorder failureRecorder;
    private final ObjectMapper mapper;

    public CdsApplyService(CdsDecisionRepository decisions, DoctorSecurityUtils security,
                           DoctorClinicalResultService clinicalResults, CdsAuditTrailService audit,
                           CdsApplyFailureRecorder failureRecorder, ObjectMapper mapper) {
        this.decisions = decisions;
        this.security = security;
        this.clinicalResults = clinicalResults;
        this.audit = audit;
        this.failureRecorder = failureRecorder;
        this.mapper = mapper.copy().enable(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS);
    }

    @Transactional
    public CdsDecisionResponse apply(UUID runId, String idempotencyKey, ApplyCdsDecisionRequest request) {
        CdsDecision decision = decisions.findByRun_RunId(runId)
                .orElseThrow(() -> new ResourceNotFoundException("CdsDecision", "runId", runId));
        security.requireAssignedDoctor(decision.getRun().getSnapshot().getAppointment());
        requireKey(idempotencyKey);
        if ("APPLIED".equals(decision.getApplyStatus())
                && idempotencyKey.equals(decision.getApplyIdempotencyKey())) {
            return CdsDecisionService.response(decision);
        }
        requireRequest(request);
        if (decision.getVersion() != request.expectedDecisionVersion()) {
            throw new StaleCdsDecisionVersionException();
        }
        if (!Set.of("APPROVED_AS_IS", "APPROVED_WITH_EDITS").contains(decision.getDecisionStatus())) {
            throw new BadRequestException("Only a Doctor-approved CDS decision can be applied");
        }
        if ("APPLIED".equals(decision.getApplyStatus())) {
            throw new CdsDecisionConflictException("This CDS decision was already applied");
        }

        LinkedHashSet<String> sections = new LinkedHashSet<>(request.selectedSections());
        if (sections.isEmpty() || sections.size() != request.selectedSections().size()
                || !CdsDecisionService.EDITABLE_FIELDS.containsAll(sections)) {
            throw new BadRequestException("Select one or more supported CDS sections");
        }
        boolean createNew = Boolean.TRUE.equals(request.createNew());
        if (createNew == (request.targetClinicalResultId() != null)) {
            throw new BadRequestException("Choose exactly one Apply target");
        }

        Map<String, Object> effective = parse(
                decision.getEditedOutputJson() == null
                        ? decision.getRun().getValidatedOutputJson()
                        : decision.getEditedOutputJson());
        Map<String, Object> selected = new LinkedHashMap<>();
        sections.forEach(section -> {
            if (effective.containsKey(section)) {
                selected.put(section, effective.get(section));
            }
        });
        if (selected.isEmpty()) {
            throw new BadRequestException("Selected CDS sections have no approved content");
        }

        Integer appointmentId = decision.getRun().getSnapshot().getAppointment().getAppointmentId();
        String doctorId = decision.getDoctorId();
        String beforeHash = CdsAuditTrailService.hash("{}");
        if (!createNew) {
            MedicalDocumentResponse before = clinicalResults.getAppointmentResults(appointmentId, doctorId)
                    .stream()
                    .filter(item -> Objects.equals(item.getDocumentId(), request.targetClinicalResultId()))
                    .findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Clinical result", "id", request.targetClinicalResultId()));
            beforeHash = hashDocument(before);
        }

        MedicalDocumentResponse applied;
        try {
            ClinicalResultUpsertRequest clinicalRequest = clinicalRequest(selected);
            applied = createNew
                    ? clinicalResults.createResult(appointmentId, doctorId, clinicalRequest)
                    : clinicalResults.updateResult(request.targetClinicalResultId(), doctorId, clinicalRequest);
        } catch (RuntimeException exception) {
            failureRecorder.record(decision.getDecisionId(), idempotencyKey, "APPLY_FAILED");
            throw exception;
        }

        decision.setApplyStatus("APPLIED");
        decision.setAppliedAt(Instant.now());
        decision.setTargetMedicalDocumentId(applied.getDocumentId());
        decision.setApplyIdempotencyKey(idempotencyKey);
        decision.setBeforeHash(beforeHash);
        decision.setAfterHash(hashDocument(applied));
        decisions.saveAndFlush(decision);
        audit.append(decision.getRun(), decision, "APPLY_SUCCEEDED", Map.of(
                "selectedSections", sections.stream().toList(),
                "targetMedicalDocumentId", decision.getTargetMedicalDocumentId(),
                "beforeHash", decision.getBeforeHash(),
                "afterHash", decision.getAfterHash(),
                "decisionVersion", decision.getVersion()));
        return CdsDecisionService.response(decision);
    }

    private ClinicalResultUpsertRequest clinicalRequest(Map<String, Object> selected) {
        ClinicalResultUpsertRequest request = new ClinicalResultUpsertRequest();
        request.setCategory("Other");
        request.setDescription("Doctor-approved AI CDS content");
        request.setTestName("AI CDS Review");
        request.setClinicalStatus("DRAFT");
        request.setPublishNow(false);
        request.setStructuredResultsJson(write(selected));
        request.setDoctorAssessment(formatAssessment(selected));
        Object summary = selected.get("clinicalSummary");
        if (summary instanceof String text) {
            request.setPatientSummary(text);
        }
        return request;
    }

    private String formatAssessment(Map<String, Object> selected) {
        StringBuilder text = new StringBuilder();
        selected.forEach((section, value) -> {
            if (!text.isEmpty()) {
                text.append("\n\n");
            }
            text.append(section).append(":\n");
            if (value instanceof List<?> list) {
                list.forEach(item -> text.append("- ").append(item).append('\n'));
            } else {
                text.append(value);
            }
        });
        return text.toString().trim();
    }

    private void requireRequest(ApplyCdsDecisionRequest request) {
        if (request == null || request.expectedDecisionVersion() == null
                || request.expectedDecisionVersion() < 0 || request.selectedSections() == null) {
            throw new BadRequestException("Invalid CDS Apply request");
        }
    }

    private void requireKey(String key) {
        if (key == null || key.isBlank() || key.length() > 128) {
            throw new BadRequestException("A valid Idempotency-Key is required");
        }
    }

    private Map<String, Object> parse(String json) {
        try {
            return mapper.readValue(json, new TypeReference<>() { });
        } catch (Exception exception) {
            throw new BadRequestException("Approved CDS content is invalid");
        }
    }

    private String hashDocument(MedicalDocumentResponse document) {
        Map<String, Object> view = new TreeMap<>();
        view.put("documentId", document.getDocumentId());
        view.put("doctorAssessment", document.getDoctorAssessment());
        view.put("patientSummary", document.getPatientSummary());
        view.put("structuredResultsJson", document.getStructuredResultsJson());
        view.put("clinicalStatus", document.getClinicalStatus());
        view.put("visibilityStatus", document.getVisibilityStatus());
        return CdsAuditTrailService.hash(write(view));
    }

    private String write(Object value) {
        try {
            return mapper.writeValueAsString(value);
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to serialize approved CDS content", exception);
        }
    }
}
