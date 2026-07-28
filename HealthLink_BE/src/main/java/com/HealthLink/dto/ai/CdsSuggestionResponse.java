package com.HealthLink.dto.ai;

import java.time.Instant;
import java.util.UUID;

public record CdsSuggestionResponse(UUID runId, String status, String errorCode, Instant createdAt) { }
