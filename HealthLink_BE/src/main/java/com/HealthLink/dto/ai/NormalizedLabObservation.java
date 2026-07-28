package com.HealthLink.dto.ai;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Conservative terminology and unit-normalization result for a laboratory observation.
 * Raw OCR/doctor-verified values are never replaced by derived values.
 */
public record NormalizedLabObservation(
        UUID observationId,
        String verificationStatus,
        String rawName,
        String normalizedName,
        String loincCode,
        String rawUnit,
        String unitUcum,
        BigDecimal rawNumericValue,
        BigDecimal normalizedNumericValue,
        String comparator,
        BigDecimal mappingConfidence,
        MappingMethod mappingMethod,
        boolean requiresReview
) {
    public enum MappingMethod {
        CURATED_EXACT_ALIAS,
        FUZZY_CANDIDATE,
        UNMAPPED
    }
}
