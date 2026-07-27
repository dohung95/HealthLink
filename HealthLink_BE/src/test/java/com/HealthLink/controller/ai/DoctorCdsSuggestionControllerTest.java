package com.HealthLink.controller.ai;

import com.HealthLink.dto.ai.CdsSuggestionDetailResponse;
import com.HealthLink.service.ai.CdsOrchestrationService;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class DoctorCdsSuggestionControllerTest {
    @Test
    void exposesAppointmentCollectionAndCanonicalDetailRoutes() throws Exception {
        UUID runId = UUID.randomUUID();
        CdsOrchestrationService service = mock(CdsOrchestrationService.class);
        CdsSuggestionDetailResponse detail = new CdsSuggestionDetailResponse(runId, UUID.randomUUID(),
                "NEEDS_DOCTOR_REVIEW", null, "rules-v1", "corpus-v1", "cds-prompt-v1",
                "qwen-demo", "a".repeat(64), "{}", Instant.now());
        when(service.list(7)).thenReturn(List.of(detail));
        when(service.detail(runId)).thenReturn(detail);
        MockMvc mvc = MockMvcBuilders.standaloneSetup(new DoctorCdsSuggestionController(service)).build();

        mvc.perform(get("/api/doctor/appointments/7/cds-suggestions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].runId").value(runId.toString()));
        mvc.perform(get("/api/doctor/cds-suggestions/{runId}", runId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.runId").value(runId.toString()));
    }
}
