package com.HealthLink.dto.ai;

import java.time.LocalDateTime;

public record ClinicalContextFieldResponse(Object value, String sourceType, String sourceId,
                                           LocalDateTime capturedAt, String freshness, String verificationState) {
}
