package com.HealthLink.dto.ai;

import java.util.List;
import java.util.UUID;

/** A deterministic, source-traceable finding from the student-demo ruleset. */
public record RuleFinding(
        String code,
        Severity severity,
        List<UUID> observationIds,
        String title,
        String explanation,
        String recommendedAction,
        String sourceDocumentId,
        String sourceSection,
        String ruleSetVersion
) {
    public enum Severity {
        INFO,
        WARNING,
        CRITICAL,
        BLOCKING
    }
}
