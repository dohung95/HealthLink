package com.HealthLink.dto.ai;

import java.time.Instant;
import java.util.UUID;

/** Doctor-only read model; output remains a review suggestion, never a medical-record update. */
public record CdsSuggestionDetailResponse(UUID runId, UUID snapshotId, long snapshotContextVersion,
                                          boolean contextCurrent, String status, String errorCode,
                                          String ruleSetVersion, String corpusVersion, String promptVersion,
                                          String modelName, String modelDigest, String validatedOutputJson,
                                          Instant createdAt) { }
