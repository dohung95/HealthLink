package com.HealthLink.controller.ai;

import com.HealthLink.dto.ai.CdsSuggestionDetailResponse;
import com.HealthLink.dto.ai.CdsDecisionResponse;
import com.HealthLink.config.AiCdsFeatureProperties;
import com.HealthLink.exception.GlobalExceptionHandler;
import com.HealthLink.exception.StaleCdsDecisionVersionException;
import com.HealthLink.service.ai.CdsApplyService;
import com.HealthLink.service.ai.CdsDecisionService;
import com.HealthLink.service.ai.CdsOrchestrationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class DoctorCdsSuggestionControllerTest {
    @Test
    void marksTheRuntimeConstructorForSpringInjection() {
        long autowiredConstructors = java.util.Arrays.stream(DoctorCdsSuggestionController.class.getConstructors())
                .filter(constructor -> constructor.isAnnotationPresent(Autowired.class))
                .count();

        assertThat(autowiredConstructors).isEqualTo(1L);
    }

    @Test
    void rejectsCdsRoutesWhenTheKillSwitchIsDisabled() throws Exception {
        CdsOrchestrationService service = mock(CdsOrchestrationService.class);
        AiCdsFeatureProperties features = new AiCdsFeatureProperties();
        MockMvc mvc = MockMvcBuilders.standaloneSetup(new DoctorCdsSuggestionController(
                service, mock(CdsDecisionService.class), mock(CdsApplyService.class), features)).build();

        mvc.perform(get("/api/doctor/appointments/7/cds-suggestions"))
                .andExpect(status().isServiceUnavailable());
        verifyNoInteractions(service);
    }

    @Test
    void exposesAppointmentCollectionAndCanonicalDetailRoutes() throws Exception {
        UUID runId = UUID.randomUUID();
        CdsOrchestrationService service = mock(CdsOrchestrationService.class);
        CdsDecisionService decisionService = mock(CdsDecisionService.class);
        CdsApplyService applyService = mock(CdsApplyService.class);
        CdsSuggestionDetailResponse detail = new CdsSuggestionDetailResponse(runId, UUID.randomUUID(),
                "NEEDS_DOCTOR_REVIEW", null, "rules-v1", "corpus-v1", "cds-prompt-v1",
                "qwen-demo", "a".repeat(64), "{}", Instant.now());
        when(service.list(7)).thenReturn(List.of(detail));
        when(service.detail(runId)).thenReturn(detail);
        MockMvc mvc = MockMvcBuilders.standaloneSetup(
                new DoctorCdsSuggestionController(service, decisionService, applyService)).build();

        mvc.perform(get("/api/doctor/appointments/7/cds-suggestions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].runId").value(runId.toString()));
        mvc.perform(get("/api/doctor/cds-suggestions/{runId}", runId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.runId").value(runId.toString()));
    }

    @Test
    void exposesSeparateDecisionApplyAndAuditRoutes() throws Exception {
        UUID runId = UUID.randomUUID();
        CdsOrchestrationService orchestration = mock(CdsOrchestrationService.class);
        CdsDecisionService decisions = mock(CdsDecisionService.class);
        CdsApplyService apply = mock(CdsApplyService.class);
        CdsDecisionResponse response = new CdsDecisionResponse(
                UUID.randomUUID(), runId, "APPROVED_AS_IS", "a".repeat(64),
                null, null, null, Instant.now(), "NOT_APPLIED", null,
                null, null, null, 0L);
        when(decisions.submit(eq(runId), any())).thenReturn(response);
        when(decisions.detail(runId)).thenReturn(Optional.empty());
        when(decisions.audit(runId)).thenReturn(List.of());
        when(apply.apply(eq(runId), eq("apply-key-01"), any())).thenReturn(response);
        MockMvc mvc = MockMvcBuilders.standaloneSetup(
                new DoctorCdsSuggestionController(orchestration, decisions, apply)).build();

        mvc.perform(post("/api/doctor/cds-suggestions/{runId}/decision", runId)
                        .contentType("application/json")
                        .content("""
                                {"decision":"APPROVED_AS_IS","expectedVersion":0}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.decisionStatus").value("APPROVED_AS_IS"));
        mvc.perform(get("/api/doctor/cds-suggestions/{runId}/decision", runId))
                .andExpect(status().isNoContent());
        mvc.perform(post("/api/doctor/cds-suggestions/{runId}/apply", runId)
                        .header("Idempotency-Key", "apply-key-01")
                        .contentType("application/json")
                        .content("""
                                {"selectedSections":["clinicalSummary"],"createNew":true,
                                 "expectedDecisionVersion":0}
                                """))
                .andExpect(status().isOk());
        mvc.perform(get("/api/doctor/cds-suggestions/{runId}/audit", runId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void staleDecisionVersionReturnsConflictInsteadOfGenericServerError() throws Exception {
        UUID runId = UUID.randomUUID();
        CdsOrchestrationService orchestration = mock(CdsOrchestrationService.class);
        CdsDecisionService decisions = mock(CdsDecisionService.class);
        CdsApplyService apply = mock(CdsApplyService.class);
        when(decisions.submit(eq(runId), any())).thenThrow(new StaleCdsDecisionVersionException());
        MockMvc mvc = MockMvcBuilders.standaloneSetup(
                        new DoctorCdsSuggestionController(orchestration, decisions, apply))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        mvc.perform(post("/api/doctor/cds-suggestions/{runId}/decision", runId)
                        .contentType("application/json")
                        .content("""
                                {"decision":"APPROVED_AS_IS","expectedVersion":4}
                                """))
                .andExpect(status().isConflict());
    }
}
