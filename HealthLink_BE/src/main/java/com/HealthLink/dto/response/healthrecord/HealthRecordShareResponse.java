package com.HealthLink.dto.response.healthrecord;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class HealthRecordShareResponse {
    private Integer shareId;
    private Integer healthRecordId;
    private String recordTitle;
    private String patientId;
    private String patientName;
    private String doctorId;
    private String doctorName;
    private String permissionLevel;
    private LocalDateTime consentGivenAt;
    private LocalDateTime expiryDate;
    private boolean revoked;
    private LocalDateTime revokedAt;
    private String revokeReason;
    private String sharedDocumentIds;
    private List<MedicalDocumentResponse> documents;
}
