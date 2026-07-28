package com.HealthLink.dto.ai;

import java.util.Map;

public record SubmitCdsDecisionRequest(
        String decision,
        Map<String, Object> editedContent,
        String reason,
        Long expectedVersion
) {
}
