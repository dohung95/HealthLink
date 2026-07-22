package com.HealthLink.service.ai;

import com.HealthLink.dto.ai.NormalizedLabObservation;
import com.HealthLink.entity.ai.LabObservation;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class LabNormalizationServiceTest {

    private final LabNormalizationService service = new LabNormalizationService();

    @Test
    void mapsCuratedVietnameseGlucoseAliasBeforeConsideringFuzzyCandidates() {
        NormalizedLabObservation result = service.normalize(observation("Đường huyết", "126", "mg/dL", LabObservation.VERIFIED, null));

        assertThat(result.normalizedName()).isEqualTo("Glucose");
        assertThat(result.loincCode()).isEqualTo("2345-7");
        assertThat(result.mappingMethod()).isEqualTo(NormalizedLabObservation.MappingMethod.CURATED_EXACT_ALIAS);
        assertThat(result.requiresReview()).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {"Glucose máu", "Đường huyết"})
    void mapsEveryCuratedVietnameseGlucoseAlias(String alias) {
        NormalizedLabObservation result = service.normalize(observation(alias, "126", "mg/dL", LabObservation.VERIFIED, null));

        assertThat(result.normalizedName()).isEqualTo("Glucose");
        assertThat(result.loincCode()).isEqualTo("2345-7");
        assertThat(result.mappingMethod()).isEqualTo(NormalizedLabObservation.MappingMethod.CURATED_EXACT_ALIAS);
    }

    @Test
    void returnsFuzzyCandidateWithoutLoincOrRuleEligibilityForNearMatch() {
        NormalizedLabObservation result = service.normalize(observation("glucose random", "126", "mg/dL", LabObservation.VERIFIED, null));

        assertThat(result.normalizedName()).isEqualTo("Glucose");
        assertThat(result.loincCode()).isNull();
        assertThat(result.mappingMethod()).isEqualTo(NormalizedLabObservation.MappingMethod.FUZZY_CANDIDATE);
        assertThat(result.requiresReview()).isTrue();
    }

    @Test
    void convertsCompatibleGlucoseUnitWhilePreservingRawValues() {
        NormalizedLabObservation result = service.normalize(observation("Glucose", "7.00", "mmol/L", LabObservation.VERIFIED, "<"));

        assertThat(result.rawNumericValue()).isEqualByComparingTo("7.00");
        assertThat(result.rawNumericValue().scale()).isEqualTo(2);
        assertThat(result.rawUnit()).isEqualTo("mmol/L");
        assertThat(result.unitUcum()).isEqualTo("mg/dL");
        assertThat(result.normalizedNumericValue()).isEqualByComparingTo("126.1274");
        assertThat(result.comparator()).isEqualTo("<");
        assertThat(result.requiresReview()).isFalse();
    }

    @Test
    void doesNotConvertMissingOrIncompatibleUnit() {
        NormalizedLabObservation missingUnit = service.normalize(observation("Creatinine", "1.10", null, LabObservation.VERIFIED, null));
        NormalizedLabObservation incompatibleUnit = service.normalize(observation("Glucose", "126", "g/dL", LabObservation.VERIFIED, null));

        assertThat(missingUnit.normalizedNumericValue()).isNull();
        assertThat(missingUnit.requiresReview()).isTrue();
        assertThat(incompatibleUnit.normalizedNumericValue()).isNull();
        assertThat(incompatibleUnit.requiresReview()).isTrue();
    }

    @Test
    void keepsVerificationStatusExplicitInNormalizedOutput() {
        NormalizedLabObservation result = service.normalize(observation("WBC", "7.200", "10^9/L", LabObservation.UNVERIFIED, ">="));

        assertThat(result.verificationStatus()).isEqualTo(LabObservation.UNVERIFIED);
        assertThat(result.rawNumericValue()).isEqualByComparingTo("7.200");
        assertThat(result.rawNumericValue().scale()).isEqualTo(3);
        assertThat(result.comparator()).isEqualTo(">=");
        assertThat(result.requiresReview()).isFalse();
    }

    private LabObservation observation(String name, String numericValue, String unit, String verificationStatus, String comparator) {
        return LabObservation.builder()
                .observationId(UUID.fromString("00000000-0000-0000-0000-000000000001"))
                .testNameRaw(name)
                .numericValue(new BigDecimal(numericValue))
                .valueText(numericValue)
                .unitRaw(unit)
                .unitUcum(unit)
                .verificationStatus(verificationStatus)
                .comparator(comparator)
                .rowOrder(1)
                .build();
    }
}
