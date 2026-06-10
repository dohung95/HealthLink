package com.HealthLink.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Result of AI screening for a single document
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentScreeningResult {
    /**
     * Document ID
     */
    private Long documentId;

    /**
     * Expected document type
     */
    private String expectedType;

    /**
     * Detected document type from AI analysis
     */
    private String detectedType;

    /**
     * Whether the document type matches expectations
     */
    private boolean typeMatches;

    /**
     * Whether the document is readable/clear
     */
    private boolean readable;

    /**
     * Whether the document appears authentic
     */
    private boolean appearsAuthentic;

    /**
     * Whether the document is complete (all info visible)
     */
    private boolean complete;

    /**
     * Confidence score (0.0 - 1.0)
     */
    private double confidence;

    /**
     * List of issues found
     */
    private List<String> issues;

    /**
     * Overall pass/fail status
     */
    private boolean passed;

    /**
     * Error message if screening failed
     */
    private String errorMessage;

    // ============ NSFW & Content Safety Fields ============

    /**
     * Whether content is safe (no NSFW, violence, etc.)
     */
    @Builder.Default
    private boolean contentSafe = true;

    /**
     * NSFW detection result
     */
    @Builder.Default
    private boolean nsfwDetected = false;

    /**
     * Violence/gore detection result
     */
    @Builder.Default
    private boolean violenceDetected = false;

    /**
     * Hate symbols/content detection
     */
    @Builder.Default
    private boolean hateContentDetected = false;

    /**
     * Content safety score (0.0 = unsafe, 1.0 = completely safe)
     */
    @Builder.Default
    private double safetyScore = 1.0;

    /**
     * Detailed safety issues found
     */
    private List<String> safetyIssues;

    /**
     * Whether this is a profile photo check
     */
    @Builder.Default
    private boolean isProfilePhoto = false;

    /**
     * For profile photo: is it a proper professional photo
     */
    @Builder.Default
    private boolean isProfessionalPhoto = true;

    /**
     * For profile photo: is a real person's face visible
     */
    @Builder.Default
    private boolean hasFaceDetected = true;
}
