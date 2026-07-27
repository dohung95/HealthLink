package com.HealthLink.integration.ai;

import com.HealthLink.dto.ai.RuleFinding;
import com.HealthLink.dto.ai.NormalizedLabObservation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;
import java.util.List;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Boundary for the authenticated internal CDS worker; it never accepts direct identifiers. */
@Component
public class CdsWorkerClient {
    private static final Pattern SAFE_FAILURE_CODE = Pattern.compile("\\\"code\\\"\\s*:\\s*\\\"([A-Z_]+)\\\"");
    private final RestTemplate restTemplate;
    private final String endpoint;
    private final String workerKey;

    @Autowired
    public CdsWorkerClient(@Value("${ai.cds.worker.base-url:http://127.0.0.1:8097}") String baseUrl,
                           @Value("${ai.service.key:}") String workerKey) {
        this(new RestTemplate(), baseUrl, workerKey);
    }

    CdsWorkerClient(RestTemplate restTemplate, String baseUrl, String workerKey) {
        this.restTemplate = restTemplate;
        this.endpoint = baseUrl + "/internal/v1/cds/generate";
        this.workerKey = workerKey;
    }

    @SuppressWarnings("unchecked")
    public CdsWorkerResponse generate(CdsWorkerRequest request) {
        if (workerKey == null || workerKey.isBlank()) throw new IllegalStateException("LOCAL_MODEL_UNAVAILABLE");
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-HealthLink-Worker-Key", workerKey);
        headers.set("X-Correlation-ID", request.runId().toString());
        try {
            WorkerPayload payload = new WorkerPayload(request.schemaVersion(), request.runId(), request.promptVersion(),
                    deidentifiedSnapshot(request.deidentifiedSnapshot(), request.normalizedLabs()),
                    workerRuleFindings(request.ruleFindings()), workerEvidence(request.approvedEvidence()));
            ResponseEntity<Map> response = restTemplate.exchange(endpoint, HttpMethod.POST, new HttpEntity<>(payload, headers), Map.class);
            Map<String, Object> body = response.getBody();
            if (body == null) throw new IllegalStateException("MODEL_SCHEMA_INVALID");
            List<String> evidenceIds = ((List<Map<String, Object>>) body.getOrDefault("evidence", List.of())).stream()
                    .map(item -> String.valueOf(item.get("evidenceId"))).toList();
            return new CdsWorkerResponse(String.valueOf(body.get("urgency")), String.valueOf(body.get("clinicalSummary")),
                    strings(body, "abnormalFindings"), strings(body, "possibleExplanations"), strings(body, "differentialDiagnoses"),
                    strings(body, "recommendedAdditionalTests"), strings(body, "treatmentOptionsForDoctorReview"), strings(body, "drugWarnings"),
                    strings(body, "missingInformation"), evidenceIds, String.valueOf(body.get("confidence")), Boolean.TRUE.equals(body.get("requiresDoctorApproval")));
        } catch (RestClientResponseException exception) {
            throw new WorkerFailureException(safeFailureCode(exception.getResponseBodyAsString()), exception);
        } catch (ResourceAccessException exception) {
            throw new IllegalStateException("LOCAL_MODEL_UNAVAILABLE", exception);
        }
    }

    private static String safeFailureCode(String responseBody) {
        Matcher matcher = SAFE_FAILURE_CODE.matcher(responseBody == null ? "" : responseBody);
        if (!matcher.find()) return "LOCAL_MODEL_UNAVAILABLE";
        String code = matcher.group(1);
        return "CDS_REQUEST_REJECTED".equals(code) ? "CONTEXT_NOT_READY" : code;
    }

    private static List<String> strings(Map<String, Object> body, String key) {
        Object value = body.get(key);
        return value instanceof List<?> list ? list.stream().map(String::valueOf).toList() : List.of();
    }

    private static Map<String, Object> deidentifiedSnapshot(Map<String, Object> values,
                                                            List<NormalizedLabObservation> normalizedLabs) {
        List<Map<String, String>> facts = new ArrayList<>(values.entrySet().stream()
                .filter(entry -> entry.getValue() != null)
                .filter(entry -> entry.getKey().matches("ageYears|ageBand|sex|symptoms|heartRate|systolicBloodPressure|diastolicBloodPressure|temperature|spo2|respiratoryRate|glucose|allergies|chronicConditions|currentMedications|medicalHistorySummary|verifiedLabs"))
                .map(entry -> Map.of("code", entry.getKey().replaceAll("([a-z])([A-Z])", "$1_$2").toUpperCase(),
                        "value", String.valueOf(entry.getValue())))
                .toList());
        if (normalizedLabs != null) {
            normalizedLabs.stream()
                    .filter(lab -> "VERIFIED".equals(lab.verificationStatus()))
                    .filter(lab -> !lab.requiresReview() && lab.normalizedNumericValue() != null
                            && lab.unitUcum() != null && !lab.unitUcum().isBlank())
                    .map(CdsWorkerClient::labFact)
                    .forEach(facts::add);
        }
        return Map.of("clinicalFacts", facts, "contextCodes", List.of("STUDENT_DEMO_ONLY"));
    }

    private static Map<String, String> labFact(NormalizedLabObservation lab) {
        String sourceCode = lab.loincCode() == null || lab.loincCode().isBlank()
                ? lab.normalizedName() : lab.loincCode();
        String code = "LAB_" + sourceCode.toUpperCase().replaceAll("[^A-Z0-9]+", "_")
                .replaceAll("^_+|_+$", "");
        Map<String, String> fact = new LinkedHashMap<>();
        fact.put("code", code);
        fact.put("value", lab.normalizedNumericValue().stripTrailingZeros().toPlainString());
        fact.put("unit", lab.unitUcum());
        fact.put("status", "VERIFIED");
        return Map.copyOf(fact);
    }

    private static List<WorkerRuleFinding> workerRuleFindings(List<RuleFinding> findings) {
        return findings == null ? List.of() : findings.stream()
                .map(finding -> new WorkerRuleFinding(finding.code(), finding.severity().name())).toList();
    }

    private static List<WorkerEvidence> workerEvidence(List<EvidenceChunk> evidence) {
        return evidence == null ? List.of() : evidence.stream().map(item -> new WorkerEvidence(item.evidenceId(), item.documentId(),
                item.title(), item.issuer(), item.version(), item.effectiveDate(), item.sectionPath(), item.page(), item.text(),
                item.checksum(), item.licenseClass(), item.corpusVersion())).toList();
    }

    private record WorkerPayload(String schemaVersion, UUID runId, String promptVersion, Map<String, Object> deidentifiedSnapshot,
                                 List<WorkerRuleFinding> ruleFindings, List<WorkerEvidence> evidenceChunks) { }
    private record WorkerRuleFinding(String code, String severity) { }
    private record WorkerEvidence(String chunkId, String documentId, String title, String issuer, String version,
                                  String effectiveDate, String sectionPath, int page, String text, String checksum,
                                  String licenseClass, String corpusVersion) { }
    public record CdsWorkerRequest(String schemaVersion, UUID runId, String promptVersion,
                                   Map<String, Object> deidentifiedSnapshot,
                                   List<NormalizedLabObservation> normalizedLabs,
                                   List<RuleFinding> ruleFindings, List<EvidenceChunk> approvedEvidence) {
        public CdsWorkerRequest(String schemaVersion, UUID runId, String promptVersion,
                                Map<String, Object> deidentifiedSnapshot,
                                List<RuleFinding> ruleFindings, List<EvidenceChunk> approvedEvidence) {
            this(schemaVersion, runId, promptVersion, deidentifiedSnapshot, List.of(),
                    ruleFindings, approvedEvidence);
        }
    }
    public record EvidenceChunk(String evidenceId, String documentId, String title, String issuer, String version,
                                String effectiveDate, String sectionPath, int page, String text, String checksum,
                                String licenseClass, String corpusVersion) { }
    public record CdsWorkerResponse(String urgency, String clinicalSummary, List<String> abnormalFindings, List<String> possibleExplanations,
                                    List<String> differentialDiagnoses, List<String> recommendedAdditionalTests, List<String> treatmentOptionsForDoctorReview,
                                    List<String> drugWarnings, List<String> missingInformation, List<String> evidenceIds, String confidence,
                                    boolean requiresDoctorApproval) { }

    public static final class WorkerFailureException extends IllegalStateException {
        public WorkerFailureException(String code, Throwable cause) { super(code, cause); }
    }
}
