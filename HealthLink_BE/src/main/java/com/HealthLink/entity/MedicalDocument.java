package com.HealthLink.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "MedicalDocuments")
@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class MedicalDocument {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "DocumentID")
    private Integer documentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "HealthRecordID", nullable = false)
    @ToString.Exclude
    private HealthRecord healthRecord;

    @Column(nullable = false)
    private String documentName;

    @Column(nullable = false)
    private String documentType;

    @Column(nullable = true)
    private String fileLocation;

    private String category;
    private String description;
    
    @Column(columnDefinition = "TEXT")
    private String testResults;
    
    private String referenceRange;
    private String testStatus;
    private LocalDateTime documentDate;
    private String performedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "AppointmentID")
    @ToString.Exclude
    private Appointment appointment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "DoctorID")
    @ToString.Exclude
    private Doctor doctor;

    @Column(length = 20)
    @Builder.Default
    private String sourceType = "PATIENT";

    @Column(length = 20)
    @Builder.Default
    private String visibilityStatus = "PUBLISHED";

    private LocalDateTime publishedAt;
    private String labFacilityName;
    private LocalDateTime sentToLabAt;
    private LocalDateTime resultReceivedAt;
    private String testName;
    private String resultUnit;

    @Column(length = 30)
    private String clinicalStatus;

    @Column(name = "UploadedAt", nullable = false)
    @Builder.Default
    private LocalDateTime uploadedAt = LocalDateTime.now();
    
    @Column(name = "FileSize")
    private Long fileSize;
    
    @Column(length = 100)
    private String mimeType;
    
    @Column(length = 500)
    private String thumbnailUrl;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String structuredResultsJson;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String doctorAssessment;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String patientSummary;

    private Double aiConfidence;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String aiWarningsJson;

    private LocalDateTime aiProcessedAt;
}