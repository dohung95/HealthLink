package com.HealthLink.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminMedicalDocumentDto {
    private Integer documentID;
    private String documentName;
    private String documentType;
    private String category;
    private String description;
    private String testResults;
    private String referenceRange;
    private String testStatus;
    private LocalDateTime documentDate;
    private String performedBy;
    private LocalDateTime uploadedAt;
    private Long fileSize;
    private String mimeType;
}
