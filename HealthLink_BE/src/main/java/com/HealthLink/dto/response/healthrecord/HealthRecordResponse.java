package com.HealthLink.dto.response.healthrecord;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class HealthRecordResponse {
    private Integer healthRecordId;
    private String patientId;
    private String patientName;
    private String title;
    private String description;
    private String recordType;
    private LocalDateTime recordDate;
    private LocalDateTime lastUpdated;
    private LocalDateTime createdAt;
    private List<MedicalDocumentResponse> documents;
}
