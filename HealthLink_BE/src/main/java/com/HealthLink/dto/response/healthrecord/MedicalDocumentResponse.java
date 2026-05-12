package com.HealthLink.dto.response.healthrecord;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class MedicalDocumentResponse {
    private Integer documentId;
    private String documentName;
    private String documentType;
    private String fileLocation;
    private String category;
    private String description;
    private String testResults;
    private String referenceRange;
    private String testStatus;
    private LocalDateTime documentDate;
    private LocalDateTime uploadedAt;
    private Long fileSize;
    private String mimeType;
    private String thumbnailUrl;
}
