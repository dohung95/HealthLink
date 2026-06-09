package com.HealthLink.dto.registration;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegistrationDocumentDto {
    private Long documentId;
    private String documentType;
    private String fileName;
    private String originalFileName;
    private Long fileSize;
    private String mimeType;
    private LocalDateTime uploadedAt;
    private String downloadUrl;

    // AI Verification fields
    private String aiVerificationStatus;
    private String aiVerificationResult;
    private Boolean documentTypeVerified;
    private Double aiConfidenceScore;
}
