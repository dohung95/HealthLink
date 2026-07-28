package com.HealthLink.dto.ai;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record LabObservationVerificationResponse(
        UUID observationId, Integer rowOrder, String testNameRaw, String testNameNormalized, String loincCode,
        String valueText, BigDecimal numericValue, String comparator, String unitRaw, String unitUcum,
        BigDecimal referenceLow, BigDecimal referenceHigh, String referenceText, String abnormalFlag,
        String verificationStatus, boolean doctorCorrected, Integer sourcePage, BoundingBox sourceBoundingBox,
        List<LabWarningResponse> warnings
) {
    public record BoundingBox(double x, double y, double width, double height) { }
}
