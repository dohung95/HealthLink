package com.HealthLink.integration.ai;

import com.HealthLink.dto.ai.RuleFinding;
import com.HealthLink.dto.ai.NormalizedLabObservation;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServiceUnavailable;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

class CdsWorkerClientTest {
    @Test
    void sendsWorkerKeyAndMapsTheStrictFastApiSuggestion() {
        RestTemplate template = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(template).build();
        CdsWorkerClient client = new CdsWorkerClient(template, "http://ai.test", "synthetic-worker-key");
        server.expect(once(), requestTo("http://ai.test/internal/v1/cds/generate"))
                .andExpect(method(org.springframework.http.HttpMethod.POST))
                .andExpect(header("X-HealthLink-Worker-Key", "synthetic-worker-key"))
                .andExpect(jsonPath("$.deidentifiedSnapshot.clinicalFacts[0].code").value("HEART_RATE"))
                .andExpect(jsonPath("$.deidentifiedSnapshot.clinicalFacts[0].value").value("72"))
                .andExpect(jsonPath("$.deidentifiedSnapshot.patientId").doesNotExist())
                .andExpect(jsonPath("$.ruleFindings[0].code").value("DEMO_RULE"))
                .andExpect(jsonPath("$.ruleFindings[0].severity").value("WARNING"))
                .andExpect(jsonPath("$.ruleFindings[0].title").doesNotExist())
                .andExpect(jsonPath("$.evidenceChunks[0].chunkId").value("chunk-1"))
                .andExpect(jsonPath("$.evidenceChunks[0].evidenceId").doesNotExist())
                .andExpect(jsonPath("$.evidenceChunks[0].title").value("Synthetic guidance"))
                .andRespond(withSuccess("""
                        {"urgency":"SOON","clinicalSummary":"synthetic","abnormalFindings":[],"possibleExplanations":[],"differentialDiagnoses":[],"recommendedAdditionalTests":[],"treatmentOptionsForDoctorReview":[],"drugWarnings":[],"missingInformation":[],"evidence":[{"evidenceId":"chunk-1"}],"confidence":"LOW","requiresDoctorApproval":true}
                        """, MediaType.APPLICATION_JSON));

        var response = client.generate(new CdsWorkerClient.CdsWorkerRequest("cds-schema-v1", UUID.randomUUID(), "cds-prompt-v1",
                Map.of("heartRate", 72, "patientId", "must-not-leave-backend"), List.of(new RuleFinding("DEMO_RULE", RuleFinding.Severity.WARNING,
                List.of(), "must-not-leave-backend", "synthetic", "synthetic", "synthetic", "synthetic", "rules-v1")),
                List.of(new CdsWorkerClient.EvidenceChunk("chunk-1", "synthetic", "Synthetic guidance", "Student demo", "v1",
                        "2026-01-01", "Page 1", 1, "synthetic", "a".repeat(64), "STUDENT_DEMO_ONLY", "demo"))));

        assertThat(response.evidenceIds()).containsExactly("chunk-1");
        assertThat(response.requiresDoctorApproval()).isTrue();
        server.verify();
    }

    @Test
    void preservesTheWorkerSafeFailureCode() {
        RestTemplate template = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(template).build();
        CdsWorkerClient client = new CdsWorkerClient(template, "http://ai.test", "synthetic-worker-key");
        server.expect(once(), requestTo("http://ai.test/internal/v1/cds/generate"))
                .andRespond(withServiceUnavailable().body("{\"detail\":{\"code\":\"LOCAL_MODEL_UNAVAILABLE\"}}")
                        .contentType(MediaType.APPLICATION_JSON));

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> client.generate(request()))
                .isInstanceOf(CdsWorkerClient.WorkerFailureException.class)
                .hasMessage("LOCAL_MODEL_UNAVAILABLE");
        server.verify();
    }

    @Test
    void sendsVerifiedNormalizedLabsAsStructuredFactsWithoutObservationIdentifiersOrRawOcr() {
        RestTemplate template = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(template).build();
        CdsWorkerClient client = new CdsWorkerClient(template, "http://ai.test", "synthetic-worker-key");
        server.expect(once(), requestTo("http://ai.test/internal/v1/cds/generate"))
                .andExpect(jsonPath("$.deidentifiedSnapshot.clinicalFacts[0].code").value("LAB_2345_7"))
                .andExpect(jsonPath("$.deidentifiedSnapshot.clinicalFacts[0].value").value("126"))
                .andExpect(jsonPath("$.deidentifiedSnapshot.clinicalFacts[0].unit").value("mg/dL"))
                .andExpect(jsonPath("$.deidentifiedSnapshot.clinicalFacts[0].status").value("VERIFIED"))
                .andExpect(jsonPath("$.deidentifiedSnapshot.clinicalFacts[0].observationId").doesNotExist())
                .andExpect(jsonPath("$.deidentifiedSnapshot.clinicalFacts[0].rawName").doesNotExist())
                .andRespond(withSuccess("""
                        {"urgency":"SOON","clinicalSummary":"synthetic","abnormalFindings":[],"possibleExplanations":[],"differentialDiagnoses":[],"recommendedAdditionalTests":[],"treatmentOptionsForDoctorReview":[],"drugWarnings":[],"missingInformation":[],"evidence":[{"evidenceId":"chunk-1"}],"confidence":"LOW","requiresDoctorApproval":true}
                        """, MediaType.APPLICATION_JSON));
        NormalizedLabObservation glucose = new NormalizedLabObservation(
                UUID.randomUUID(), "VERIFIED", "Glucose raw OCR", "Glucose", "2345-7",
                "mg/dL", "mg/dL", new BigDecimal("126"), new BigDecimal("126"), null,
                BigDecimal.ONE, NormalizedLabObservation.MappingMethod.CURATED_EXACT_ALIAS, false);

        client.generate(new CdsWorkerClient.CdsWorkerRequest(
                "cds-schema-v1", UUID.randomUUID(), "cds-prompt-v1", Map.of(), List.of(glucose),
                List.of(), List.of(new CdsWorkerClient.EvidenceChunk(
                "chunk-1", "synthetic", "Synthetic guidance", "Student demo", "v1",
                "2026-01-01", "Page 1", 1, "synthetic", "a".repeat(64),
                "STUDENT_DEMO_ONLY", "demo"))));

        server.verify();
    }

    @Test
    void mapsRejectedDeidentifiedContextToStableNonRetryableCode() {
        RestTemplate template = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(template).build();
        CdsWorkerClient client = new CdsWorkerClient(template, "http://ai.test", "synthetic-worker-key");
        server.expect(once(), requestTo("http://ai.test/internal/v1/cds/generate"))
                .andRespond(withStatus(org.springframework.http.HttpStatus.UNPROCESSABLE_ENTITY)
                        .body("{\"detail\":{\"code\":\"CDS_REQUEST_REJECTED\"}}")
                        .contentType(MediaType.APPLICATION_JSON));

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> client.generate(request()))
                .isInstanceOf(CdsWorkerClient.WorkerFailureException.class)
                .hasMessage("CONTEXT_NOT_READY");
        server.verify();
    }

    private static CdsWorkerClient.CdsWorkerRequest request() {
        return new CdsWorkerClient.CdsWorkerRequest("cds-schema-v1", UUID.randomUUID(), "cds-prompt-v1",
                Map.of("heartRate", 72), List.of(),
                List.of(new CdsWorkerClient.EvidenceChunk("chunk-1", "synthetic", "Synthetic guidance", "Student demo", "v1",
                        "2026-01-01", "Page 1", 1, "synthetic", "a".repeat(64), "STUDENT_DEMO_ONLY", "demo")));
    }
}
