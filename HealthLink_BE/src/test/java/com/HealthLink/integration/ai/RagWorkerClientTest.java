package com.HealthLink.integration.ai;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class RagWorkerClientTest {
    @Test
    void sendsOnlyDeidentifiedQueryAndMapsApprovedChunks() {
        RestTemplate template = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(template).build();
        RagWorkerClient client = new RagWorkerClient(template, "http://ai.test", "synthetic-worker-key");
        server.expect(once(), requestTo("http://ai.test/internal/v1/rag/retrieve"))
                .andExpect(header("X-HealthLink-Worker-Key", "synthetic-worker-key"))
                .andExpect(jsonPath("$.query").value("GLUCOSE REVIEW"))
                .andExpect(jsonPath("$.patientId").doesNotExist())
                .andRespond(withSuccess("""
                    {"insufficientEvidence":false,"chunks":[{"chunkId":"chunk-1","documentId":"synthetic","title":"Synthetic","issuer":"Demo","version":"v1","effectiveDate":"2026-01-01","sectionPath":"Page 1","page":1,"text":"synthetic evidence","score":0.9,"checksum":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","licenseClass":"STUDENT_DEMO_ONLY","corpusVersion":"demo"}]}
                    """, MediaType.APPLICATION_JSON));

        var result = client.retrieve("GLUCOSE REVIEW", "demo");

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().evidenceId()).isEqualTo("chunk-1");
        server.verify();
    }
}
