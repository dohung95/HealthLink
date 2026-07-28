package com.HealthLink.dto.ai;

import java.time.Instant;
import java.util.UUID;

public record CdsDecisionResponse(
        UUID decisionId,
        UUID runId,
        String decisionStatus,
        String originalOutputHash,
        String editedOutputJson,
        String editedOutputHash,
        String reason,
        Instant decidedAt,
        String applyStatus,
        Instant appliedAt,
        Integer targetMedicalDocumentId,
        String beforeHash,
        String afterHash,
        long version
) {
}
