package com.HealthLink.dto.ai;

import java.math.BigDecimal;

public record LabObservationUpdateRequest(
        Long expectedVersion,
        String decision,
        String testNameRaw,
        String valueText,
        BigDecimal numericValue,
        String comparator,
        String unitRaw,
        String unitUcum,
        BigDecimal referenceLow,
        BigDecimal referenceHigh,
        String referenceText,
        String abnormalFlag,
        String testNameNormalized,
        String loincCode
) { }
