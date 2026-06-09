package com.HealthLink.service.ai;

import com.HealthLink.config.GeminiConfig;
import com.HealthLink.dto.ai.DocumentScreeningResult;
import com.HealthLink.dto.ai.ScreeningResult;
import com.HealthLink.dto.ai.ScreeningStatus;
import com.HealthLink.entity.RegistrationDocument;
import com.HealthLink.entity.RegistrationRequest;
import com.HealthLink.repository.registration.RegistrationDocumentRepository;
import com.HealthLink.repository.registration.RegistrationRequestRepository;
import com.HealthLink.service.admin.AdminAuditLogService;
import com.HealthLink.service.email.EmailService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.nio.file.Files;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AIScreeningServiceImpl implements AIScreeningService {

    private final GeminiAIService geminiAIService;
    private final GeminiConfig geminiConfig;
    private final RegistrationRequestRepository requestRepository;
    private final RegistrationDocumentRepository documentRepository;
    private final EmailService emailService;
    private final AdminAuditLogService auditLogService;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public ScreeningResult screenRegistration(Long requestId) {
        RegistrationRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Registration request not found: " + requestId));

        // Update status to PROCESSING
        request.setAiScreeningStatus("PROCESSING");
        requestRepository.save(request);

        List<RegistrationDocument> documents = documentRepository.findByRegistrationRequest_RequestId(requestId);
        List<DocumentScreeningResult> documentResults = new ArrayList<>();
        List<String> allIssues = new ArrayList<>();
        double totalScore = 0;
        double totalSafetyScore = 0;
        int scoredDocs = 0;
        boolean hasUnsafeContent = false;
        boolean hasProfilePhoto = false;

        for (RegistrationDocument doc : documents) {
            DocumentScreeningResult docResult = screenSingleDocument(doc);
            documentResults.add(docResult);

            // Track if Profile Photo exists
            if ("Profile Photo".equals(doc.getDocumentType())) {
                hasProfilePhoto = true;
            }

            // Check for critical safety violations - IMMEDIATE REJECTION
            if (!docResult.isContentSafe() || docResult.isNsfwDetected() ||
                docResult.isViolenceDetected() || docResult.isHateContentDetected()) {
                hasUnsafeContent = true;
                log.warn("UNSAFE CONTENT DETECTED in document {} (type: {}): NSFW={}, Violence={}, Hate={}",
                        doc.getDocumentId(), doc.getDocumentType(),
                        docResult.isNsfwDetected(), docResult.isViolenceDetected(), docResult.isHateContentDetected());
            }

            // Update document entity
            String verificationStatus;
            if (!docResult.isContentSafe()) {
                verificationStatus = "REJECTED_UNSAFE";
            } else if (docResult.isPassed()) {
                verificationStatus = "VERIFIED";
            } else {
                verificationStatus = "FLAGGED";
            }
            doc.setAiVerificationStatus(verificationStatus);
            doc.setAiConfidenceScore(docResult.getConfidence());
            doc.setDocumentTypeVerified(docResult.isTypeMatches());
            try {
                doc.setAiVerificationResult(objectMapper.writeValueAsString(docResult));
            } catch (Exception e) {
                log.error("Error serializing document result", e);
            }
            documentRepository.save(doc);

            totalScore += docResult.getConfidence();
            totalSafetyScore += docResult.getSafetyScore();
            scoredDocs++;

            if (docResult.getIssues() != null) {
                allIssues.addAll(docResult.getIssues());
            }
            if (docResult.getSafetyIssues() != null) {
                allIssues.addAll(docResult.getSafetyIssues());
            }
        }

        // Calculate overall scores
        double overallScore = scoredDocs > 0 ? totalScore / scoredDocs : 0.5;
        double overallSafetyScore = scoredDocs > 0 ? totalSafetyScore / scoredDocs : 1.0;

        // Determine status - UNSAFE CONTENT = IMMEDIATE REJECTION
        ScreeningStatus status;
        if (hasUnsafeContent) {
            status = ScreeningStatus.REJECTED;
            overallScore = 0.0; // Force score to 0 for unsafe content
            allIssues.add(0, "⚠️ CRITICAL: Inappropriate content detected in uploaded files");
        } else {
            status = ScreeningResult.calculateStatus(overallScore, geminiConfig.getAutoScreening().getRejectThreshold());
        }

        ScreeningResult result = ScreeningResult.builder()
                .requestId(requestId)
                .status(status)
                .overallScore(overallScore)
                .documentResults(documentResults)
                .allIssues(allIssues)
                .screenedAt(LocalDateTime.now())
                .build();

        // Update registration request
        request.setAiScreeningStatus(status.name());
        request.setAiScreenedAt(LocalDateTime.now());
        try {
            request.setAiScreeningResult(objectMapper.writeValueAsString(result));
        } catch (Exception e) {
            log.error("Error serializing screening result", e);
        }

        // Auto-reject if below threshold OR unsafe content detected
        if ((status == ScreeningStatus.REJECTED || hasUnsafeContent) && geminiConfig.getAutoScreening().isEnabled()) {
            request.setStatus("AI_Rejected");
            if (hasUnsafeContent) {
                request.setAiRejectionReason("Application rejected due to inappropriate content in uploaded files. " +
                        "This may include NSFW, violent, or otherwise unsuitable material for a healthcare platform.");
            } else {
                request.setAiRejectionReason(result.buildRejectionReason());
            }
            sendRejectionEmail(request, result);

            // Log AI rejection in audit log
            logAIRejection(request, result, hasUnsafeContent);
        }

        requestRepository.save(request);
        log.info("Screening completed for request {}: status={}, score={}, safetyScore={}, unsafeContent={}",
                requestId, status, overallScore, overallSafetyScore, hasUnsafeContent);
        return result;
    }

    @Override
    public DocumentScreeningResult screenDocument(Long documentId) {
        RegistrationDocument doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found: " + documentId));

        return screenSingleDocument(doc);
    }

    private DocumentScreeningResult screenSingleDocument(RegistrationDocument doc) {
        if (!geminiAIService.isAvailable()) {
            return DocumentScreeningResult.builder()
                    .documentId(doc.getDocumentId())
                    .expectedType(doc.getDocumentType())
                    .passed(true)
                    .confidence(0.5)
                    .issues(List.of("AI verification unavailable"))
                    .build();
        }

        try {
            File file = new File(doc.getFilePath());
            if (!file.exists()) {
                return DocumentScreeningResult.builder()
                        .documentId(doc.getDocumentId())
                        .expectedType(doc.getDocumentType())
                        .passed(false)
                        .confidence(0)
                        .issues(List.of("File not found"))
                        .errorMessage("File not found: " + doc.getFilePath())
                        .build();
            }

            byte[] fileContent = Files.readAllBytes(file.toPath());
            String base64Content = Base64.getEncoder().encodeToString(fileContent);

            DocumentScreeningResult result = geminiAIService.verifyDocument(
                    base64Content,
                    doc.getMimeType(),
                    doc.getDocumentType()
            );
            result.setDocumentId(doc.getDocumentId());
            return result;

        } catch (Exception e) {
            log.error("Error screening document {}: {}", doc.getDocumentId(), e.getMessage());
            return DocumentScreeningResult.builder()
                    .documentId(doc.getDocumentId())
                    .expectedType(doc.getDocumentType())
                    .passed(true)
                    .confidence(0.5)
                    .issues(List.of("Screening error: " + e.getMessage()))
                    .errorMessage(e.getMessage())
                    .build();
        }
    }

    @Override
    @Async
    public void processAllPendingScreenings() {
        List<RegistrationRequest> pendingRequests = requestRepository.findAll().stream()
                .filter(r -> "PENDING".equals(r.getAiScreeningStatus()) && "Pending".equals(r.getStatus()))
                .toList();

        log.info("Processing {} pending screenings", pendingRequests.size());

        for (RegistrationRequest request : pendingRequests) {
            try {
                List<RegistrationDocument> docs = documentRepository.findByRegistrationRequest_RequestId(request.getRequestId());
                // Only screen if documents have been uploaded
                if (!docs.isEmpty()) {
                    screenRegistration(request.getRequestId());
                }
            } catch (Exception e) {
                log.error("Error processing screening for request {}: {}", request.getRequestId(), e.getMessage());
            }
        }
    }

    @Override
    @Transactional
    public ScreeningResult rescanRegistration(Long requestId) {
        RegistrationRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Registration request not found: " + requestId));

        // Reset AI fields
        request.setAiScreeningStatus("PENDING");
        request.setAiScreeningResult(null);
        request.setAiRejectionReason(null);
        request.setAiScreenedAt(null);

        // Reset document AI fields
        List<RegistrationDocument> docs = documentRepository.findByRegistrationRequest_RequestId(requestId);
        for (RegistrationDocument doc : docs) {
            doc.setAiVerificationStatus("PENDING");
            doc.setAiVerificationResult(null);
            doc.setDocumentTypeVerified(false);
            doc.setAiConfidenceScore(null);
            documentRepository.save(doc);
        }

        requestRepository.save(request);

        // Re-run screening
        return screenRegistration(requestId);
    }

    @Override
    @Transactional
    public void overrideAIDecision(Long requestId, String adminId, String overrideReason) {
        RegistrationRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Registration request not found: " + requestId));

        // Clear AI rejection and set back to pending for manual review
        request.setAiScreeningStatus("OVERRIDDEN");
        request.setStatus("Pending");
        request.setAiRejectionReason("AI decision overridden by admin: " + adminId + ". Reason: " + overrideReason);
        request.setReviewedBy(adminId);
        request.setReviewedAt(LocalDateTime.now());

        requestRepository.save(request);

        log.info("AI decision overridden for request {} by admin {}", requestId, adminId);
    }

    private void sendRejectionEmail(RegistrationRequest request, ScreeningResult result) {
        try {
            String recipientName = request.getFullName() != null ? request.getFullName() : request.getPharmacyName();
            String registrationType = request.getRegistrationType();
            String rejectionReason = "AI Auto-Screening: " + result.buildRejectionReason();

            emailService.sendRejectionEmail(
                    request.getEmail(),
                    recipientName,
                    registrationType,
                    rejectionReason
            );
            log.info("AI rejection email sent to {}", request.getEmail());
        } catch (Exception e) {
            log.error("Failed to send AI rejection email to {}: {}", request.getEmail(), e.getMessage());
        }
    }

    /**
     * Log AI rejection in audit log
     */
    private void logAIRejection(RegistrationRequest request, ScreeningResult result, boolean hasUnsafeContent) {
        try {
            String recipientName = request.getFullName() != null ? request.getFullName() : request.getPharmacyName();
            String registrationType = request.getRegistrationType();

            // Build detailed rejection reason for audit log
            StringBuilder details = new StringBuilder();
            details.append("AI Score: ").append(String.format("%.2f", result.getOverallScore()));
            details.append(" | ");

            if (hasUnsafeContent) {
                details.append("Reason: Inappropriate content detected (NSFW/Violence/Hate)");
            } else {
                details.append("Reason: ").append(result.buildRejectionReason());
            }

            // Add document issues summary
            if (result.getDocumentResults() != null && !result.getDocumentResults().isEmpty()) {
                long failedDocs = result.getDocumentResults().stream()
                        .filter(d -> !d.isPassed())
                        .count();
                details.append(" | Failed documents: ").append(failedDocs).append("/").append(result.getDocumentResults().size());
            }

            auditLogService.logAIRejection(
                    registrationType,
                    request.getRequestId(),
                    recipientName,
                    request.getEmail(),
                    details.toString()
            );

            log.info("AI rejection audit log created for request {}", request.getRequestId());
        } catch (Exception e) {
            log.error("Failed to create AI rejection audit log for request {}: {}",
                    request.getRequestId(), e.getMessage());
        }
    }
}
