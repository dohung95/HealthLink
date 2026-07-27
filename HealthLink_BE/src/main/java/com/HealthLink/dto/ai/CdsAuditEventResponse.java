package com.HealthLink.dto.ai;

import java.time.Instant;
import java.util.UUID;

public record CdsAuditEventResponse(
        UUID eventId,
        UUID runId,
        UUID decisionId,
        String actorType,
        String actorId,
        String eventType,
        Instant timestamp,
        String correlationId,
        String metadataJson,
        String previousHash,
        String eventHash
) {
}
