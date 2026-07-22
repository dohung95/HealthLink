package com.HealthLink.service.ai;

import com.HealthLink.dto.ai.NormalizedLabObservation;
import com.HealthLink.dto.ai.RuleFinding;
import com.HealthLink.entity.ai.ClinicalRuleEvaluation;
import com.HealthLink.entity.ai.ClinicalContextSnapshot;
import com.HealthLink.repository.ai.ClinicalContextSnapshotRepository;
import com.HealthLink.repository.ai.ClinicalRuleEvaluationRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;

/** Deterministic rule evaluation for approved student-demo material; it is not clinical validation. */
@Service
public class ClinicalRuleEngine {
    private static final String GLUCOSE_LOINC = "2345-7";
    private static final String GLUCOSE_UNIT = "mg/dL";
    private static final BigDecimal GLUCOSE_REVIEW_THRESHOLD = new BigDecimal("126");
    private static final String SOURCE_DOCUMENT = "who-hearts-d-type-2-diabetes-2020";
    private static final String SOURCE_SECTION = "page 13";

    private final ClinicalRuleSetLoader ruleSetLoader;
    private final ClinicalRuleEvaluationRepository evaluations;
    private final ClinicalContextSnapshotRepository snapshots;
    private final ObjectMapper objectMapper;

    public ClinicalRuleEngine(ClinicalRuleSetLoader ruleSetLoader,
                              ClinicalRuleEvaluationRepository evaluations,
                              ClinicalContextSnapshotRepository snapshots,
                              ObjectMapper objectMapper) {
        this.ruleSetLoader = ruleSetLoader;
        this.evaluations = evaluations;
        this.snapshots = snapshots;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public List<RuleFinding> evaluate(UUID snapshotId, String snapshotHash,
                                      List<NormalizedLabObservation> observations,
                                      Map<String, ?> safetyContext) {
        if (snapshotId == null || snapshotHash == null || snapshotHash.isBlank()) {
            throw new IllegalArgumentException("snapshotId and snapshotHash are required");
        }
        ClinicalRuleSetLoader.RuleSet ruleSet = ruleSetLoader.load();
        List<NormalizedLabObservation> sortedObservations = observations == null ? List.of() : observations.stream()
                .sorted(Comparator.comparing(observation -> observation.observationId().toString())).toList();
        Map<String, ?> normalizedSafetyContext = safetyContext == null ? Map.of() : new TreeMap<>(safetyContext);
        List<RuleFinding> findings = findings(sortedObservations, normalizedSafetyContext, ruleSet.version());
        String findingsJson = serialize(findings);
        ClinicalContextSnapshot snapshot = snapshots.getReferenceById(snapshotId);
        evaluations.save(ClinicalRuleEvaluation.builder().evaluationId(UUID.randomUUID()).snapshot(snapshot)
                .ruleSetVersion(ruleSet.version()).findingsJson(findingsJson)
                .inputHash(inputHash(snapshotHash, sortedObservations, normalizedSafetyContext, ruleSet.version()))
                .evaluatedAt(Instant.now()).build());
        return findings;
    }

    private List<RuleFinding> findings(List<NormalizedLabObservation> observations, Map<String, ?> safetyContext, String version) {
        List<RuleFinding> results = new ArrayList<>();
        List<NormalizedLabObservation> eligibleGlucose = new ArrayList<>();
        for (NormalizedLabObservation observation : observations) {
            if (!"VERIFIED".equals(observation.verificationStatus())) continue;
            if (needsNormalizationReview(observation)) {
                results.add(normalizationReview(observation, version));
                continue;
            }
            if (isPotentialGlucoseRuleInput(observation)) eligibleGlucose.add(observation);
        }
        if (!eligibleGlucose.isEmpty()) {
            if (missingSafetyContext(safetyContext)) {
                results.add(missingSafetyContext(version));
            } else if (isEligibleAdultNonPregnantFasting(safetyContext)) {
                for (NormalizedLabObservation observation : eligibleGlucose) results.add(glucoseReview(observation, version));
            }
        }
        return results.stream().sorted(Comparator.comparing(RuleFinding::code)
                .thenComparing(finding -> finding.observationIds().isEmpty() ? "" : finding.observationIds().get(0).toString()))
                .toList();
    }

    private static boolean needsNormalizationReview(NormalizedLabObservation observation) {
        return observation.mappingMethod() != NormalizedLabObservation.MappingMethod.CURATED_EXACT_ALIAS
                || observation.requiresReview() || observation.loincCode() == null || observation.unitUcum() == null
                || observation.normalizedNumericValue() == null;
    }

    private static boolean isPotentialGlucoseRuleInput(NormalizedLabObservation observation) {
        return GLUCOSE_LOINC.equals(observation.loincCode()) && GLUCOSE_UNIT.equalsIgnoreCase(observation.unitUcum())
                && comparatorCompatible(observation.comparator())
                && observation.normalizedNumericValue().compareTo(GLUCOSE_REVIEW_THRESHOLD) >= 0;
    }

    private static boolean comparatorCompatible(String comparator) {
        if (comparator == null || comparator.isBlank() || "=".equals(comparator)) return true;
        return ">".equals(comparator) || ">=".equals(comparator);
    }

    private static boolean missingSafetyContext(Map<String, ?> context) {
        return unknown(context.get("fastingStatus")) || unknown(context.get("ageYears")) || unknown(context.get("pregnancyStatus"));
    }

    private static boolean unknown(Object value) {
        return value == null || String.valueOf(value).isBlank() || "UNKNOWN".equalsIgnoreCase(String.valueOf(value));
    }

    private static boolean isEligibleAdultNonPregnantFasting(Map<String, ?> context) {
        return "CONFIRMED".equalsIgnoreCase(String.valueOf(context.get("fastingStatus")))
                && age(context.get("ageYears")) >= 18
                && "NOT_PREGNANT".equalsIgnoreCase(String.valueOf(context.get("pregnancyStatus")));
    }

    private static int age(Object value) {
        if (value instanceof Number number) return number.intValue();
        try { return Integer.parseInt(String.valueOf(value)); } catch (NumberFormatException ignored) { return -1; }
    }

    private static RuleFinding normalizationReview(NormalizedLabObservation observation, String version) {
        return finding("NORMALIZATION_REVIEW_REQUIRED", RuleFinding.Severity.BLOCKING, List.of(observation.observationId()),
                "Normalization review required", "A verified laboratory observation is not safely normalized for rules evaluation.",
                "Correct or reject the observation before any numeric rule is evaluated.", version);
    }

    private static RuleFinding missingSafetyContext(String version) {
        return finding("MISSING_SAFETY_CONTEXT", RuleFinding.Severity.BLOCKING, List.of(), "Safety context required",
                "A potentially applicable glucose review rule cannot run because fasting, age, or pregnancy context is unknown.",
                "Doctor review is required; capture the missing context before any numeric rule is evaluated.", version);
    }

    private static RuleFinding glucoseReview(NormalizedLabObservation observation, String version) {
        return finding("DEMO_GLUCOSE_REVIEW_126", RuleFinding.Severity.WARNING, List.of(observation.observationId()),
                "Glucose value needs doctor review", "A verified, normalized glucose result meets the student-demo review threshold.",
                "Doctor review is required; repeat testing and clinical confirmation are required before any conclusion.", version);
    }

    private static RuleFinding finding(String code, RuleFinding.Severity severity, List<UUID> observationIds,
                                       String title, String explanation, String action, String version) {
        return new RuleFinding(code, severity, observationIds, title, explanation, action, SOURCE_DOCUMENT, SOURCE_SECTION, version);
    }

    private String serialize(List<RuleFinding> findings) {
        try { return objectMapper.writeValueAsString(findings); }
        catch (JsonProcessingException exception) { throw new IllegalStateException("Unable to serialize rule findings", exception); }
    }

    private String inputHash(String snapshotHash, List<NormalizedLabObservation> observations, Map<String, ?> context, String version) {
        Map<String, Object> canonical = new LinkedHashMap<>();
        canonical.put("snapshotHash", snapshotHash);
        canonical.put("ruleSetVersion", version);
        canonical.put("observations", observations);
        canonical.put("safetyContext", new TreeMap<>(context));
        return sha256(serializeCanonical(canonical));
    }

    private String serializeCanonical(Map<String, Object> value) {
        try { return objectMapper.writeValueAsString(value); }
        catch (JsonProcessingException exception) { throw new IllegalStateException("Unable to serialize rule input", exception); }
    }

    private static String sha256(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException exception) { throw new IllegalStateException("SHA-256 is unavailable", exception); }
    }
}
