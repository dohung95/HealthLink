package com.HealthLink.dto.response.healthrecord;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class MedicalDocumentResponse {
    private Integer documentId;
    private Integer healthRecordId;
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
    private Integer appointmentId;
    private String doctorId;
    private String doctorName;
    private String sourceType;
    private String visibilityStatus;
    private LocalDateTime publishedAt;
    private String labFacilityName;
    private LocalDateTime sentToLabAt;
    private LocalDateTime resultReceivedAt;
    private String testName;
    private String resultUnit;
    private String clinicalStatus;
    private String structuredResultsJson;
    private String doctorAssessment;
    private String patientSummary;
    private Double aiConfidence;
    private String aiWarningsJson;
    private LocalDateTime aiProcessedAt;
}
