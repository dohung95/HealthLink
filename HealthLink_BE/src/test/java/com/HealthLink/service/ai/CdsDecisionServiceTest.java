package com.HealthLink.service.ai;

import com.HealthLink.dto.ai.SubmitCdsDecisionRequest;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.ai.CdsDecision;
import com.HealthLink.entity.ai.CdsSuggestionRun;
import com.HealthLink.entity.ai.ClinicalContextSnapshot;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.CdsDecisionConflictException;
import com.HealthLink.exception.StaleClinicalContextVersionException;
import com.HealthLink.repository.ai.CdsDecisionRepository;
import com.HealthLink.repository.ai.CdsSuggestionRunRepository;
import com.HealthLink.utility.DoctorSecurityUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class CdsDecisionServiceTest {
    private final CdsSuggestionRunRepository runs = mock(CdsSuggestionRunRepository.class);
    private final CdsDecisionRepository decisions = mock(CdsDecisionRepository.class);
    private final DoctorSecurityUtils security = mock(DoctorSecurityUtils.class);
    private final CdsAuditTrailService audit = mock(CdsAuditTrailService.class);
    private final ClinicalContextService contexts = mock(ClinicalContextService.class);
    private CdsDecisionService service;

    @BeforeEach
    void setUp() {
        when(contexts.isSnapshotCurrent(any())).thenReturn(true);
        service = new CdsDecisionService(runs, decisions, security, audit, new ObjectMapper(), contexts);
    }

    @Test
    void approveAsIsStoresDoctorDecisionWithoutChangingModelOutput() {
        CdsSuggestionRun run = run();
        String original = run.getValidatedOutputJson();
        when(runs.findByIdForDecision(run.getRunId())).thenReturn(Optional.of(run));
        when(decisions.findByRun_RunId(run.getRunId())).thenReturn(Optional.empty());
        when(decisions.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.submit(run.getRunId(),
                new SubmitCdsDecisionRequest("APPROVED_AS_IS", null, null, 0L));

        assertEquals("APPROVED_AS_IS", response.decisionStatus());
        assertEquals("NOT_APPLIED", response.applyStatus());
        assertEquals(original, run.getValidatedOutputJson());
        assertNull(response.editedOutputJson());
        assertNotNull(response.originalOutputHash());
        verify(security).requireAssignedDoctor(run.getSnapshot().getAppointment());
        verify(audit).append(eq(run), any(CdsDecision.class), eq("DECISION_APPROVED_AS_IS"), anyMap());
    }

    @Test
    void approveWithEditsStoresMergedCopyAndRejectsCriticalOrCitationEdits() throws Exception {
        CdsSuggestionRun run = run();
        when(runs.findByIdForDecision(run.getRunId())).thenReturn(Optional.of(run));
        when(decisions.findByRun_RunId(run.getRunId())).thenReturn(Optional.empty());
        when(decisions.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));

        Map<String, Object> edit = Map.of("clinicalSummary", "Doctor-reviewed summary");
        var response = service.submit(run.getRunId(),
                new SubmitCdsDecisionRequest("APPROVED_WITH_EDITS", edit, "Clarified wording", 0L));
        Map<?, ?> merged = new ObjectMapper().readValue(response.editedOutputJson(), Map.class);

        assertEquals("Doctor-reviewed summary", merged.get("clinicalSummary"));
        assertEquals("URGENT", merged.get("urgency"));
        assertNotEquals(response.originalOutputHash(), response.editedOutputHash());

        for (String protectedField : new String[]{"urgentWarnings", "abnormalFindings", "citations", "confidence"}) {
            assertThrows(BadRequestException.class, () -> service.submit(run.getRunId(),
                    new SubmitCdsDecisionRequest("APPROVED_WITH_EDITS",
                            Map.of(protectedField, java.util.List.of("changed")), "Unsafe edit", 0L)));
        }
    }

    @Test
    void requiresReasonAndRejectsDuplicateOrStaleDecision() {
        CdsSuggestionRun run = run();
        when(runs.findByIdForDecision(run.getRunId())).thenReturn(Optional.of(run));
        when(decisions.findByRun_RunId(run.getRunId())).thenReturn(Optional.empty());

        assertThrows(BadRequestException.class, () -> service.submit(run.getRunId(),
                new SubmitCdsDecisionRequest("REJECTED", null, " ", 0L)));

        CdsDecision existing = CdsDecision.builder().decisionId(UUID.randomUUID()).run(run)
                .decisionStatus("APPROVED_AS_IS").version(2L).build();
        when(decisions.findByRun_RunId(run.getRunId())).thenReturn(Optional.of(existing));
        assertThrows(CdsDecisionConflictException.class, () -> service.submit(run.getRunId(),
                new SubmitCdsDecisionRequest("APPROVED_AS_IS", null, null, 2L)));
        assertThrows(com.HealthLink.exception.StaleCdsDecisionVersionException.class, () -> service.submit(run.getRunId(),
                new SubmitCdsDecisionRequest("APPROVED_AS_IS", null, null, 1L)));
    }

    @Test
    void rejectsDecisionWhenItsClinicalContextSnapshotIsNoLongerCurrent() {
        CdsSuggestionRun run = run();
        when(runs.findByIdForDecision(run.getRunId())).thenReturn(Optional.of(run));
        when(contexts.isSnapshotCurrent(run.getSnapshot())).thenReturn(false);

        assertThrows(StaleClinicalContextVersionException.class, () -> service.submit(run.getRunId(),
                new SubmitCdsDecisionRequest("APPROVED_AS_IS", null, null, 0L)));

        verify(decisions, never()).saveAndFlush(any());
        verify(audit, never()).append(any(), any(), anyString(), anyMap());
    }

    private CdsSuggestionRun run() {
        Doctor doctor = Doctor.builder().doctorId("doctor-01").build();
        Appointment appointment = Appointment.builder().appointmentId(1).doctor(doctor).build();
        ClinicalContextSnapshot snapshot = ClinicalContextSnapshot.builder()
                .snapshotId(UUID.randomUUID()).appointment(appointment).build();
        Map<String, Object> output = new LinkedHashMap<>();
        output.put("urgency", "URGENT");
        output.put("clinicalSummary", "Original AI summary");
        output.put("abnormalFindings", java.util.List.of("CRITICAL_GLUCOSE"));
        output.put("possibleExplanations", java.util.List.of("Possible explanation"));
        output.put("differentialDiagnoses", java.util.List.of("Differential"));
        output.put("recommendedAdditionalTests", java.util.List.of("Repeat test"));
        output.put("treatmentOptionsForDoctorReview", java.util.List.of("Review hydration"));
        output.put("drugWarnings", java.util.List.of());
        output.put("missingInformation", java.util.List.of());
        output.put("urgentWarnings", java.util.List.of("CRITICAL_GLUCOSE"));
        output.put("citations", java.util.List.of("evidence-1"));
        output.put("confidence", "MEDIUM");
        output.put("requiresDoctorApproval", true);
        try {
            return CdsSuggestionRun.builder().runId(UUID.randomUUID()).snapshot(snapshot)
                    .status("NEEDS_DOCTOR_REVIEW").validatedOutputJson(new ObjectMapper().writeValueAsString(output))
                    .ruleSetVersion("student-demo-v1").corpusVersion("student-demo-2026.1")
                    .promptVersion("cds-prompt-v1").modelName("qwen").modelDigest("a".repeat(64))
                    .createdAt(Instant.now()).build();
        } catch (Exception exception) {
            throw new AssertionError(exception);
        }
    }
}
