package com.HealthLink.dto.request.healthrecord;

import jakarta.validation.constraints.Size;
import lombok.Data;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class ClinicalResultUpsertRequest {
    @Size(max = 100)
    private String category;

    @Size(max = 1000)
    private String description;

    @Size(max = 255)
    private String testName;

    private String testResults;

    @Size(max = 50)
    private String resultUnit;

    @Size(max = 255)
    private String referenceRange;

    @Size(max = 50)
    private String testStatus;

    @Size(max = 30)
    private String clinicalStatus;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate documentDate;

    @Size(max = 255)
    private String performedBy;

    @Size(max = 255)
    private String labFacilityName;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    private LocalDateTime sentToLabAt;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    private LocalDateTime resultReceivedAt;

    private Boolean publishNow;

    private MultipartFile file;

    private String structuredResultsJson;
    private String doctorAssessment;
    private String patientSummary;
    private Double aiConfidence;
    private String aiWarningsJson;

    public LocalDateTime documentDateTimeOrNull() {
        return documentDate != null ? documentDate.atStartOfDay() : null;
    }
}
