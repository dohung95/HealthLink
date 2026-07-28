package com.HealthLink.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AiCdsOpenApiContractTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper objectMapper;

    @Test
    void documentsDoctorDecisionApplyAndAuditRoutes() throws Exception {
        JsonNode document = objectMapper.readTree(mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        JsonNode paths = document.path("paths");

        assertThat(paths.at("/~1api~1doctor~1cds-suggestions~1{runId}~1decision/post").isMissingNode()).isFalse();
        assertThat(paths.at("/~1api~1doctor~1cds-suggestions~1{runId}~1apply/post").isMissingNode()).isFalse();
        assertThat(paths.at("/~1api~1doctor~1cds-suggestions~1{runId}~1audit/get").isMissingNode()).isFalse();
        assertThat(paths.at("/~1api~1doctor~1cds-suggestions~1{runId}~1decision/post/responses/409")
                .isMissingNode()).isFalse();
        assertThat(paths.at("/~1api~1doctor~1cds-suggestions~1{runId}~1apply/post/responses/409")
                .isMissingNode()).isFalse();
        JsonNode detailSchema = document.at("/components/schemas/CdsSuggestionDetailResponse/properties");
        assertThat(detailSchema.path("snapshotContextVersion").path("type").asText()).isEqualTo("integer");
        assertThat(detailSchema.path("contextCurrent").path("type").asText()).isEqualTo("boolean");
    }
}
