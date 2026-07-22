package com.HealthLink.dto.ai;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

public record ClinicalContextSnapshotResponse(UUID snapshotId, String sha256, LocalDateTime createdAt,
                                              Map<String, Boolean> requiredFieldStatus,
                                              Map<String, Object> provenanceSummary) {
}
