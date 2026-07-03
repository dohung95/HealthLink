package com.HealthLink.service.ai;

import com.HealthLink.dto.ai.ClinicalResultAiAnalysisResponse;
import com.HealthLink.dto.ai.ClinicalResultAiContext;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class LocalAIServiceImplClinicalResultTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();
    private LocalAIServiceImpl service;
    private MockRestServiceServer mockServer;

    @BeforeEach
    void setUp() {
        service = new LocalAIServiceImpl(restTemplate);
        mockServer = MockRestServiceServer.bindTo(restTemplate).build();
        ReflectionTestUtils.setField(service, "aiServiceUrl", "http://localhost:9999/mock-ai");
    }

    @Test
    void analyzeClinicalResult_successfulResponse_mapsAllFields() throws Exception {
        String responseJson = objectMapper.writeValueAsString(Map.ofEntries(
                Map.entry("success", true),
                Map.entry("category", "Blood Test"),
                Map.entry("labFacilityName", "Central Lab"),
                Map.entry("documentDate", "2026-07-03"),
                Map.entry("detectedPatientName", "Nguyen Minh Anh"),
                Map.entry("patientMatched", true),
                Map.entry("tests", List.of(Map.ofEntries(
                        Map.entry("testName", "WBC"),
                        Map.entry("resultValue", "6.1"),
                        Map.entry("unit", "10^9/L"),
                        Map.entry("referenceRange", "4.0-11.0"),
                        Map.entry("flag", "NORMAL"),
                        Map.entry("confidence", 0.88)
                ))),
                Map.entry("abnormalSummary", "No critical abnormalities detected."),
                Map.entry("doctorAssessmentDraft", "CBC values are within reference ranges."),
                Map.entry("patientSummaryDraft", "Your blood test report is available."),
                Map.entry("warnings", List.of()),
                Map.entry("confidence", 0.84)
        ));

        mockServer.expect(requestTo("http://localhost:9999/mock-ai/parse-clinical-result"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(responseJson, MediaType.APPLICATION_JSON));

        ClinicalResultAiContext context = ClinicalResultAiContext.builder()
                .appointmentId(1)
                .patientName("Nguyen Minh Anh")
                .patientId("P001")
                .build();

        ClinicalResultAiAnalysisResponse result = service.analyzeClinicalResult(
                "dGVzdC1maWxlLWNvbnRlbnQ=", "image/jpeg", context);

        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getCategory()).isEqualTo("Blood Test");
        assertThat(result.getLabFacilityName()).isEqualTo("Central Lab");
        assertThat(result.getDocumentDate()).isNotNull();
        assertThat(result.getDetectedPatientName()).isEqualTo("Nguyen Minh Anh");
        assertThat(result.getPatientMatched()).isTrue();
        assertThat(result.getTests()).hasSize(1);
        assertThat(result.getTests().get(0).getTestName()).isEqualTo("WBC");
        assertThat(result.getTests().get(0).getFlag()).isEqualTo("NORMAL");
        assertThat(result.getAbnormalSummary()).isEqualTo("No critical abnormalities detected.");
        assertThat(result.getDoctorAssessmentDraft()).isEqualTo("CBC values are within reference ranges.");
        assertThat(result.getPatientSummaryDraft()).isEqualTo("Your blood test report is available.");
        assertThat(result.getWarnings()).isEmpty();
        assertThat(result.getConfidence()).isEqualTo(0.84);

        mockServer.verify();
    }

    @Test
    void analyzeClinicalResult_patientMismatch_doesNotAffectSuccess() throws Exception {
        String responseJson = objectMapper.writeValueAsString(Map.ofEntries(
                Map.entry("success", true),
                Map.entry("category", "Blood Test"),
                Map.entry("labFacilityName", "Trung Tam Xet Nghiem"),
                Map.entry("documentDate", "2026-06-15"),
                Map.entry("detectedPatientName", "Nguyen Van A"),
                Map.entry("patientMatched", false),
                Map.entry("tests", List.of(Map.ofEntries(
                        Map.entry("testName", "WBC"),
                        Map.entry("resultValue", "11.5"),
                        Map.entry("unit", "x10^9/L"),
                        Map.entry("referenceRange", "4.5-11.0"),
                        Map.entry("flag", "HIGH"),
                        Map.entry("confidence", 0.82)
                ))),
                Map.entry("abnormalSummary", "WBC is high"),
                Map.entry("doctorAssessmentDraft", "Review elevated WBC."),
                Map.entry("patientSummaryDraft", "One white blood cell value is above range."),
                Map.entry("warnings", List.of("AI draft must be reviewed")),
                Map.entry("confidence", 0.82)
        ));

        mockServer.expect(requestTo("http://localhost:9999/mock-ai/parse-clinical-result"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(responseJson, MediaType.APPLICATION_JSON));

        ClinicalResultAiContext context = ClinicalResultAiContext.builder()
                .appointmentId(2)
                .patientName("Wrong Patient")
                .build();

        ClinicalResultAiAnalysisResponse result = service.analyzeClinicalResult(
                "aW1hZ2UtYnl0ZXM=", "image/png", context);

        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getPatientMatched()).isFalse();
        assertThat(result.getTests()).hasSize(1);
        assertThat(result.getTests().get(0).getFlag()).isEqualTo("HIGH");
        assertThat(result.getDoctorAssessmentDraft()).isEqualTo("Review elevated WBC.");

        mockServer.verify();
    }

    @Test
    void analyzeClinicalResult_failedResponse_returnsManualEntryWarning() throws Exception {
        String responseJson = objectMapper.writeValueAsString(Map.of(
                "success", false,
                "error", "Could not read file"
        ));

        mockServer.expect(requestTo("http://localhost:9999/mock-ai/parse-clinical-result"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(responseJson, MediaType.APPLICATION_JSON));

        ClinicalResultAiContext context = ClinicalResultAiContext.builder()
                .appointmentId(1).build();

        ClinicalResultAiAnalysisResponse result = service.analyzeClinicalResult(
                "aW52YWxpZA==", "image/png", context);

        assertThat(result.isSuccess()).isFalse();
        assertThat(result.getWarnings()).contains("Please enter the result manually");
        assertThat(result.getConfidence()).isZero();

        mockServer.verify();
    }
}
