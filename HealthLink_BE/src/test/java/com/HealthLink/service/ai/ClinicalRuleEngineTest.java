package com.HealthLink.service.ai;

import com.HealthLink.dto.ai.NormalizedLabObservation;
import com.HealthLink.dto.ai.RuleFinding;
import com.HealthLink.entity.ai.ClinicalRuleEvaluation;
import com.HealthLink.entity.ai.ClinicalContextSnapshot;
import com.HealthLink.repository.ai.ClinicalContextSnapshotRepository;
import com.HealthLink.repository.ai.ClinicalRuleEvaluationRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ByteArrayResource;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ClinicalRuleEngineTest {

    @Test
    void evaluatesOnlyVerifiedCuratedGlucoseWithCompleteSafetyContext() {
        CapturingRepository capture = new CapturingRepository();
        ClinicalRuleEngine engine = engine(capture, approvedLoader());

        List<RuleFinding> findings = engine.evaluate(UUID.randomUUID(), "a".repeat(64), List.of(verifiedGlucose()),
                Map.of("fastingStatus", "CONFIRMED", "ageYears", 21, "pregnancyStatus", "NOT_PREGNANT"));

        assertThat(findings).extracting(RuleFinding::code).containsExactly("DEMO_GLUCOSE_REVIEW_126");
        assertThat(findings.getFirst().severity()).isEqualTo(RuleFinding.Severity.WARNING);
        assertThat(findings.getFirst().recommendedAction()).contains("Doctor review", "repeat testing", "clinical confirmation");
        assertThat(capture.saved).hasSize(1);
        assertThat(capture.saved.getFirst().getRuleSetVersion()).isEqualTo("student-demo-v1");
    }

    @Test
    void emitsOneBlockingFindingWhenPotentialGlucoseRuleHasUnknownSafetyContext() {
        List<RuleFinding> findings = engine(new CapturingRepository(), approvedLoader()).evaluate(UUID.randomUUID(), "b".repeat(64),
                List.of(verifiedGlucose()), Map.of("fastingStatus", "UNKNOWN", "ageYears", 21, "pregnancyStatus", "NOT_PREGNANT"));

        assertThat(findings).extracting(RuleFinding::code).containsExactly("MISSING_SAFETY_CONTEXT");
        assertThat(findings.getFirst().severity()).isEqualTo(RuleFinding.Severity.BLOCKING);
    }

    @Test
    void blocksVerifiedObservationThatCannotBeSafelyNormalizedWithoutNumericFinding() {
        NormalizedLabObservation incompatible = new NormalizedLabObservation(UUID.randomUUID(), "VERIFIED", "Glucose", "Glucose", "2345-7",
                "mg/L", null, new BigDecimal("126"), null, null, BigDecimal.ONE,
                NormalizedLabObservation.MappingMethod.CURATED_EXACT_ALIAS, true);

        List<RuleFinding> findings = engine(new CapturingRepository(), approvedLoader()).evaluate(UUID.randomUUID(), "c".repeat(64),
                List.of(incompatible), Map.of("fastingStatus", "CONFIRMED", "ageYears", 21, "pregnancyStatus", "NOT_PREGNANT"));

        assertThat(findings).extracting(RuleFinding::code).containsExactly("NORMALIZATION_REVIEW_REQUIRED");
    }

    @Test
    void ignoresUnverifiedAndFuzzyObservationsForNumericRules() {
        NormalizedLabObservation unverified = new NormalizedLabObservation(UUID.randomUUID(), "UNVERIFIED", "Glucose", "Glucose", "2345-7",
                "mg/dL", "mg/dL", new BigDecimal("126"), new BigDecimal("126"), null, BigDecimal.ONE,
                NormalizedLabObservation.MappingMethod.CURATED_EXACT_ALIAS, false);
        NormalizedLabObservation fuzzy = new NormalizedLabObservation(UUID.randomUUID(), "VERIFIED", "Glucose roughly", "Glucose", null,
                "mg/dL", null, new BigDecimal("126"), null, null, new BigDecimal("0.60"),
                NormalizedLabObservation.MappingMethod.FUZZY_CANDIDATE, true);

        List<RuleFinding> findings = engine(new CapturingRepository(), approvedLoader()).evaluate(UUID.randomUUID(), "d".repeat(64),
                List.of(unverified, fuzzy), Map.of("fastingStatus", "CONFIRMED", "ageYears", 21, "pregnancyStatus", "NOT_PREGNANT"));

        assertThat(findings).extracting(RuleFinding::code).containsExactly("NORMALIZATION_REVIEW_REQUIRED");
    }

    @Test
    void rejectsTamperedRulesetChecksumAndSourceMismatch() {
        String tampered = ruleset().replace("student-demo-v1", "student-demo-v2");
        ClinicalRuleSetLoader tamperedLoader = new ClinicalRuleSetLoader(bytes(tampered), bytes(approvalFor(ruleset())));
        String wrongSourceApproval = approvalFor(ruleset()).replace("page 13", "page 14");
        ClinicalRuleSetLoader mismatchedSourceLoader = new ClinicalRuleSetLoader(bytes(ruleset()), bytes(wrongSourceApproval));

        assertThatThrownBy(tamperedLoader::load).isInstanceOf(IllegalStateException.class).hasMessageContaining("checksum");
        assertThatThrownBy(mismatchedSourceLoader::load).isInstanceOf(IllegalStateException.class).hasMessageContaining("sourceSection");
    }

    @Test
    void producesByteEquivalentFindingJsonForOneHundredReplays() throws Exception {
        ClinicalRuleEngine engine = engine(new CapturingRepository(), approvedLoader());
        UUID observationId = UUID.fromString("00000000-0000-0000-0000-000000000001");
        NormalizedLabObservation stableGlucose = new NormalizedLabObservation(observationId, "VERIFIED", "Glucose", "Glucose", "2345-7",
                "mg/dL", "mg/dL", new BigDecimal("126"), new BigDecimal("126"), null, BigDecimal.ONE,
                NormalizedLabObservation.MappingMethod.CURATED_EXACT_ALIAS, false);
        ObjectMapper mapper = new ObjectMapper();
        List<String> replays = new ArrayList<>();
        UUID snapshotId = UUID.fromString("00000000-0000-0000-0000-000000000002");
        for (int replay = 0; replay < 100; replay++) {
            replays.add(mapper.writeValueAsString(engine.evaluate(snapshotId, "e".repeat(64), List.of(stableGlucose),
                    Map.of("fastingStatus", "CONFIRMED", "ageYears", 21, "pregnancyStatus", "NOT_PREGNANT"))));
        }

        assertThat(replays).allSatisfy(json -> assertThat(json).isEqualTo(replays.getFirst()));
    }

    private ClinicalRuleEngine engine(CapturingRepository capture, ClinicalRuleSetLoader loader) {
        ClinicalRuleEvaluationRepository evaluations = mock(ClinicalRuleEvaluationRepository.class);
        when(evaluations.save(any(ClinicalRuleEvaluation.class))).thenAnswer(invocation -> {
            capture.saved.add(invocation.getArgument(0));
            return invocation.getArgument(0);
        });
        ClinicalContextSnapshotRepository snapshots = mock(ClinicalContextSnapshotRepository.class);
        when(snapshots.getReferenceById(any(UUID.class))).thenReturn(mock(ClinicalContextSnapshot.class));
        return new ClinicalRuleEngine(loader, evaluations, snapshots, new ObjectMapper());
    }

    private ClinicalRuleSetLoader approvedLoader() {
        return new ClinicalRuleSetLoader(bytes(ruleset()), bytes(approvalFor(ruleset())));
    }

    private ByteArrayResource bytes(String value) {
        return new ByteArrayResource(value.getBytes(StandardCharsets.UTF_8));
    }

    private String ruleset() {
        return """
                {"schemaVersion":"1","ruleSetVersion":"student-demo-v1","effectiveDate":"2026-07-22","intendedUse":"STUDENT_DEMO_ONLY",
                "sources":[{"documentId":"who-hearts-d-type-2-diabetes-2020","version":"2020","section":"page 13"}],"rules":[]}
                """;
    }

    private String approvalFor(String ruleset) {
        return """
                {"schemaVersion":"1","ruleSetVersion":"student-demo-v1","effectiveDate":"2026-07-22","reviewerName":"Hiệp",
                "reviewerRole":"DEMO_REVIEWER","approvalDate":"2026-07-22","status":"APPROVED_STUDENT_DEMO",
                "intendedUse":"STUDENT_DEMO_ONLY","rulesetSha256":"%s","sourceDocumentId":"who-hearts-d-type-2-diabetes-2020",
                "sourceVersion":"2020","sourceSection":"page 13"}
                """.formatted(sha256(ruleset));
    }

    private String sha256(String value) {
        try { return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (Exception exception) { throw new AssertionError(exception); }
    }

    private static final class CapturingRepository {
        private final List<ClinicalRuleEvaluation> saved = new ArrayList<>();
    }

    private NormalizedLabObservation verifiedGlucose() {
        return new NormalizedLabObservation(UUID.randomUUID(), "VERIFIED", "Glucose", "Glucose", "2345-7",
                "mg/dL", "mg/dL", new BigDecimal("126"), new BigDecimal("126"), null,
                BigDecimal.ONE, NormalizedLabObservation.MappingMethod.CURATED_EXACT_ALIAS, false);
    }
}
