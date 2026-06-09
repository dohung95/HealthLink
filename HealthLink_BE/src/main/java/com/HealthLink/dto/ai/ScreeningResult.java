package com.HealthLink.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Overall screening result for a registration request
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScreeningResult {
    /**
     * Registration request ID
     */
    private Long requestId;

    /**
     * Overall screening status
     */
    private ScreeningStatus status;

    /**
     * Overall confidence score (0.0 - 1.0)
     */
    private double overallScore;

    /**
     * Overall safety score (0.0 - 1.0)
     */
    @Builder.Default
    private double overallSafetyScore = 1.0;

    /**
     * Whether any unsafe content was detected
     */
    @Builder.Default
    private boolean hasUnsafeContent = false;

    /**
     * Individual document screening results
     */
    @Builder.Default
    private List<DocumentScreeningResult> documentResults = new ArrayList<>();

    /**
     * List of all issues found across documents
     */
    @Builder.Default
    private List<String> allIssues = new ArrayList<>();

    /**
     * Safety-specific issues (NSFW, violence, etc.)
     */
    @Builder.Default
    private List<String> safetyIssues = new ArrayList<>();

    /**
     * When screening was performed
     */
    private LocalDateTime screenedAt;

    /**
     * Build rejection reason from all issues
     */
    public String buildRejectionReason() {
        if (allIssues == null || allIssues.isEmpty()) {
            return "Registration did not meet verification requirements.";
        }

        // Prioritize safety issues
        List<String> prioritizedIssues = new ArrayList<>();
        for (String issue : allIssues) {
            if (issue.contains("NSFW") || issue.contains("violence") ||
                issue.contains("inappropriate") || issue.contains("CRITICAL")) {
                prioritizedIssues.add(0, issue);
            } else {
                prioritizedIssues.add(issue);
            }
        }

        StringBuilder reason = new StringBuilder("The following issues were found: ");
        for (int i = 0; i < Math.min(prioritizedIssues.size(), 5); i++) {
            if (i > 0) reason.append("; ");
            reason.append(prioritizedIssues.get(i));
        }
        if (prioritizedIssues.size() > 5) {
            reason.append(" and ").append(prioritizedIssues.size() - 5).append(" more issues.");
        }
        return reason.toString();
    }

    /**
     * Calculate status based on document results and threshold
     */
    public static ScreeningStatus calculateStatus(double overallScore, double rejectThreshold) {
        if (overallScore >= 0.8) {
            return ScreeningStatus.PASSED;
        } else if (overallScore >= rejectThreshold) {
            return ScreeningStatus.FLAGGED;
        } else {
            return ScreeningStatus.REJECTED;
        }
    }

    /**
     * Get summary of screening result
     */
    public String getSummary() {
        StringBuilder sb = new StringBuilder();
        sb.append("Screening Result: ").append(status.name());
        sb.append(" | Score: ").append(String.format("%.2f", overallScore));
        sb.append(" | Safety: ").append(String.format("%.2f", overallSafetyScore));
        sb.append(" | Documents: ").append(documentResults.size());
        if (hasUnsafeContent) {
            sb.append(" | ⚠️ UNSAFE CONTENT DETECTED");
        }
        return sb.toString();
    }
}
