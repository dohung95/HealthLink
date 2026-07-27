package com.HealthLink.service.ai;

import com.HealthLink.dto.ai.ApplyCdsDecisionRequest;
import com.HealthLink.dto.request.healthrecord.ClinicalResultUpsertRequest;
import com.HealthLink.dto.response.healthrecord.MedicalDocumentResponse;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.ai.CdsDecision;
import com.HealthLink.entity.ai.CdsSuggestionRun;
import com.HealthLink.entity.ai.ClinicalContextSnapshot;
import com.HealthLink.repository.ai.CdsDecisionRepository;
import com.HealthLink.service.healthrecord.DoctorClinicalResultService;
import com.HealthLink.utility.DoctorSecurityUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class CdsApplyServiceTest {
    private final CdsDecisionRepository decisions = mock(CdsDecisionRepository.class);
    private final DoctorSecurityUtils security = mock(DoctorSecurityUtils.class);
    private final DoctorClinicalResultService clinicalResults = mock(DoctorClinicalResultService.class);
    private final CdsAuditTrailService audit = mock(CdsAuditTrailService.class);
    private final CdsApplyFailureRecorder failureRecorder = mock(CdsApplyFailureRecorder.class);
    private final CdsApplyService service = new CdsApplyService(
            decisions, security, clinicalResults, audit, failureRecorder, new ObjectMapper());

    @Test
    void explicitApplyCreatesDraftFromSelectedApprovedSectionsAndIsIdempotent() {
        CdsDecision decision = approvedDecision();
        when(decisions.findByRun_RunId(decision.getRun().getRunId())).thenReturn(Optional.of(decision));
        when(decisions.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(clinicalResults.createResult(eq(1), eq("doctor-01"), any()))
                .thenReturn(MedicalDocumentResponse.builder().documentId(91).doctorAssessment("Approved summary").build());

        ApplyCdsDecisionRequest request = new ApplyCdsDecisionRequest(
                List.of("clinicalSummary"), null, true, 0L);
        var first = service.apply(decision.getRun().getRunId(), "apply-key-01", request);
        var replay = service.apply(decision.getRun().getRunId(), "apply-key-01", request);

        assertEquals("APPLIED", first.applyStatus());
        assertEquals(91, first.targetMedicalDocumentId());
        assertEquals(first.targetMedicalDocumentId(), replay.targetMedicalDocumentId());
        ArgumentCaptor<ClinicalResultUpsertRequest> requestCaptor =
                ArgumentCaptor.forClass(ClinicalResultUpsertRequest.class);
        verify(clinicalResults, times(1)).createResult(eq(1), eq("doctor-01"), requestCaptor.capture());
        verify(clinicalResults, never()).publishResult(anyInt(), anyString());
        assertEquals("DRAFT", requestCaptor.getValue().getClinicalStatus());
        assertFalse(Boolean.TRUE.equals(requestCaptor.getValue().getPublishNow()));
        assertTrue(requestCaptor.getValue().getStructuredResultsJson().contains("clinicalSummary"));
        assertFalse(requestCaptor.getValue().getStructuredResultsJson().contains("confidence"));
    }

    @Test
    void updateTargetUsesExistingSecuredClinicalResultPath() {
        CdsDecision decision = approvedDecision();
        when(decisions.findByRun_RunId(decision.getRun().getRunId())).thenReturn(Optional.of(decision));
        when(decisions.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(clinicalResults.getAppointmentResults(1, "doctor-01"))
                .thenReturn(List.of(MedicalDocumentResponse.builder().documentId(17).doctorAssessment("Before").build()));
        when(clinicalResults.updateResult(eq(17), eq("doctor-01"), any()))
                .thenReturn(MedicalDocumentResponse.builder().documentId(17).doctorAssessment("After").build());

        var response = service.apply(decision.getRun().getRunId(), "apply-key-02",
                new ApplyCdsDecisionRequest(List.of("clinicalSummary"), 17, false, 0L));

        assertEquals(17, response.targetMedicalDocumentId());
        assertNotEquals(response.beforeHash(), response.afterHash());
        verify(clinicalResults).updateResult(eq(17), eq("doctor-01"), any());
        verify(clinicalResults, never()).publishResult(anyInt(), anyString());
    }

    @Test
    void failedOfficialApplyRecordsFailureAndDoesNotEraseApproval() {
        CdsDecision decision = approvedDecision();
        when(decisions.findByRun_RunId(decision.getRun().getRunId())).thenReturn(Optional.of(decision));
        when(clinicalResults.createResult(eq(1), eq("doctor-01"), any()))
                .thenThrow(new IllegalStateException("synthetic failure"));

        assertThrows(IllegalStateException.class, () -> service.apply(decision.getRun().getRunId(), "apply-key-03",
                new ApplyCdsDecisionRequest(List.of("clinicalSummary"), null, true, 0L)));

        assertEquals("APPROVED_AS_IS", decision.getDecisionStatus());
        verify(failureRecorder).record(decision.getDecisionId(), "apply-key-03", "APPLY_FAILED");
        verify(clinicalResults, never()).publishResult(anyInt(), anyString());
    }

    private CdsDecision approvedDecision() {
        Doctor doctor = Doctor.builder().doctorId("doctor-01").build();
        Appointment appointment = Appointment.builder().appointmentId(1).doctor(doctor).build();
        ClinicalContextSnapshot snapshot = ClinicalContextSnapshot.builder()
                .snapshotId(UUID.randomUUID()).appointment(appointment).build();
        String output = """
                {"urgency":"ROUTINE","clinicalSummary":"Approved summary","abnormalFindings":[],
                "possibleExplanations":[],"differentialDiagnoses":[],"recommendedAdditionalTests":["Repeat CBC"],
                "treatmentOptionsForDoctorReview":[],"drugWarnings":[],"missingInformation":[],
                "urgentWarnings":[],"citations":["evidence-1"],"confidence":"MEDIUM","requiresDoctorApproval":true}
                """;
        CdsSuggestionRun run = CdsSuggestionRun.builder().runId(UUID.randomUUID()).snapshot(snapshot)
                .status("NEEDS_DOCTOR_REVIEW").validatedOutputJson(output).createdAt(Instant.now())
                .ruleSetVersion("student-demo-v1").corpusVersion("student-demo-2026.1")
                .promptVersion("cds-prompt-v1").modelName("qwen").modelDigest("a".repeat(64)).build();
        return CdsDecision.builder().decisionId(UUID.randomUUID()).run(run).doctorId("doctor-01")
                .decisionStatus("APPROVED_AS_IS").originalOutputHash("b".repeat(64))
                .applyStatus("NOT_APPLIED").version(0L).build();
    }
}
