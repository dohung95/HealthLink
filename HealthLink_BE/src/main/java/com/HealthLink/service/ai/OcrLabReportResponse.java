package com.HealthLink.service.ai;

import java.math.BigDecimal;
import java.util.List;

public record OcrLabReportResponse(String schemaVersion, String engineVersion, String parserVersion, String sha256,
                                   List<Page> pages, List<Observation> observations, List<Warning> warnings,
                                   ProcessingMetrics processingMetrics) {
    public record Page(int pageNumber, int width, int height) {
    }

    public record Observation(int rowOrder, String testNameRaw, String valueText, BigDecimal numericValue,
                              String comparator, String unitRaw, String referenceText, BigDecimal referenceLow,
                              BigDecimal referenceHigh, String abnormalFlag, BigDecimal confidence, int sourcePage,
                              BoundingBox sourceBoundingBox, String verificationStatus) {
    }

    public record BoundingBox(double x, double y, double width, double height) {
    }

    public record Warning(String code, Integer rowOrder) {
    }

    public record ProcessingMetrics(int pageCount, int candidateCount, int lowConfidenceCount) {
    }
}
