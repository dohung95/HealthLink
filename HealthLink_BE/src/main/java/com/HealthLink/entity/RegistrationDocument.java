package com.HealthLink.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "RegistrationDocuments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegistrationDocument {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "DocumentID")
    private Long documentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "RequestID", nullable = false)
    @ToString.Exclude
    private RegistrationRequest registrationRequest;

    @Column(name = "DocumentType", nullable = false, length = 100)
    private String documentType; // e.g., "Medical Degree", "Practice License", "ID Card", "Business License", etc.

    @Column(name = "FileName", nullable = false, length = 255)
    private String fileName;

    @Column(name = "OriginalFileName", nullable = false, length = 255)
    private String originalFileName;

    @Column(name = "FilePath", nullable = false, length = 500)
    private String filePath;

    @Column(name = "FileSize")
    private Long fileSize;

    @Column(name = "MimeType", length = 100)
    private String mimeType;

    @Column(name = "UploadedAt")
    @Builder.Default
    private LocalDateTime uploadedAt = LocalDateTime.now();

    // ============ AI Verification Fields ============
    @Column(name = "AIVerificationStatus", length = 20)
    @Builder.Default
    private String aiVerificationStatus = "PENDING"; // PENDING, VERIFIED, FLAGGED, REJECTED

    @Column(name = "AIVerificationResult", columnDefinition = "NVARCHAR(MAX)")
    private String aiVerificationResult;

    @Column(name = "DocumentTypeVerified")
    @Builder.Default
    private Boolean documentTypeVerified = false;

    @Column(name = "AIConfidenceScore")
    private Double aiConfidenceScore;
}
