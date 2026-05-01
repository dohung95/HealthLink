package com.HealthLink.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "MedicalDocuments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicalDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "DocumentID")
    private Integer documentId;

    @Column(name = "HealthRecordID", nullable = false)
    private Integer healthRecordId;

    @Column(name = "DocumentName", nullable = false)
    private String documentName;

    @Column(name = "DocumentType", nullable = false)
    private String documentType;

    @Column(name = "FileLocation", nullable = false)
    private String fileLocation;

    @Column(name = "Category")
    private String category;

    @Column(name = "Description")
    private String description;

    @Column(name = "TestResults")
    private String testResults;

    @Column(name = "ReferenceRange")
    private String referenceRange;

    @Column(name = "TestStatus")
    private String testStatus;

    @Column(name = "DocumentDate")
    private LocalDateTime documentDate;

    @Column(name = "PerformedBy")
    private String performedBy;

    @Column(name = "UploadedAt", nullable = false)
    private LocalDateTime uploadedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "HealthRecordID", insertable = false, updatable = false)
    private HealthRecord healthRecord;

    // Category constants
    public static final String CATEGORY_XRAY = "X-Ray";
    public static final String CATEGORY_CT_SCAN = "CT-Scan";
    public static final String CATEGORY_MRI = "MRI";
    public static final String CATEGORY_ULTRASOUND = "Ultrasound";
    public static final String CATEGORY_LAB_REPORT = "Lab-Report";
    public static final String CATEGORY_BLOOD_TEST = "Blood-Test";
    public static final String CATEGORY_PRESCRIPTION = "Prescription";
    public static final String CATEGORY_CONSULTATION_NOTES = "Consultation-Notes";
    public static final String CATEGORY_OTHER = "Other";

    // Test status constants
    public static final String STATUS_NORMAL = "Normal";
    public static final String STATUS_ABNORMAL = "Abnormal";
    public static final String STATUS_CRITICAL = "Critical";

    @PrePersist
    protected void onCreate() {
        if (uploadedAt == null) {
            uploadedAt = LocalDateTime.now();
        }
    }
}
