package com.HealthLink.service.ai;

import com.HealthLink.dto.ai.NormalizedLabObservation;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;

/** Builds only approved corpus topics; raw laboratory values are never sent to retrieval. */
final class CdsRetrievalQueryBuilder {
    private static final Map<String, String> TOPIC_BY_NORMALIZED_LAB = Map.of(
            "Glucose", "type 2 diabetes",
            "Creatinine", "chronic kidney disease",
            "Hemoglobin", "haemoglobin"
    );

    String build(List<NormalizedLabObservation> observations) {
        var topics = new LinkedHashSet<String>();
        if (observations != null) {
            for (NormalizedLabObservation observation : observations) {
                if (observation != null && observation.normalizedName() != null) {
                    String topic = TOPIC_BY_NORMALIZED_LAB.get(observation.normalizedName());
                    if (topic != null) topics.add(topic);
                }
            }
        }
        return topics.isEmpty() ? "clinical review" : String.join(" ", topics) + " clinical review";
    }
}
