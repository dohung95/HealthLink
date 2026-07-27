package com.HealthLink.service.ai;

import com.HealthLink.dto.ai.NormalizedLabObservation;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CdsRetrievalQueryBuilderTest {
    @Test
    void mapsVerifiedGlucoseToTheApprovedDiabetesRetrievalTopic() {
        String query = new CdsRetrievalQueryBuilder().build(List.of(observation("Glucose")));

        assertThat(query).contains("type 2 diabetes");
        assertThat(query).doesNotContain("Glucose");
    }

    private static NormalizedLabObservation observation(String normalizedName) {
        return new NormalizedLabObservation(null, "VERIFIED", normalizedName, normalizedName, null,
                null, null, null, null, null, null,
                NormalizedLabObservation.MappingMethod.CURATED_EXACT_ALIAS, false);
    }
}
