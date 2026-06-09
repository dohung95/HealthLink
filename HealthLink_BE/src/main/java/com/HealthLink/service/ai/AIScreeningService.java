package com.HealthLink.service.ai;

import com.HealthLink.dto.ai.DocumentScreeningResult;
import com.HealthLink.dto.ai.ScreeningResult;

/**
 * Service interface for AI-powered registration screening
 */
public interface AIScreeningService {

    /**
     * Screen a registration request by verifying all its documents
     * @param requestId Registration request ID
     * @return Screening result with overall status and document details
     */
    ScreeningResult screenRegistration(Long requestId);

    /**
     * Screen a single document
     * @param documentId Document ID
     * @return Document screening result
     */
    DocumentScreeningResult screenDocument(Long documentId);

    /**
     * Process all pending screenings (batch job)
     */
    void processAllPendingScreenings();

    /**
     * Re-screen a registration request
     * @param requestId Registration request ID
     * @return New screening result
     */
    ScreeningResult rescanRegistration(Long requestId);

    /**
     * Override AI decision (admin action)
     * @param requestId Registration request ID
     * @param adminId Admin user ID
     * @param overrideReason Reason for override
     */
    void overrideAIDecision(Long requestId, String adminId, String overrideReason);
}
