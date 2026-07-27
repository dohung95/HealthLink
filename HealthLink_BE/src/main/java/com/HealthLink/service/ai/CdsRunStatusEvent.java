package com.HealthLink.service.ai;

import java.util.UUID;

/** Doctor-only realtime payload; no clinical context, prompt, evidence, or model output. */
public record CdsRunStatusEvent(UUID runId, String status, String errorCode) {
}
