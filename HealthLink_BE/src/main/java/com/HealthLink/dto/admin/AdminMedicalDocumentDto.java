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
    private String fileLocation;
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
