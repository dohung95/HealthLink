package com.HealthLink.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Result of AI text moderation for a patient review, before it is published.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewModerationResult {

    @Builder.Default
    private boolean flagged = false;

    private String reason;
}
