package com.HealthLink.entity.ai;

import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.HealthRecord;
import com.HealthLink.entity.MedicalDocument;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "LabReports")
@Getter
@Setter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class LabReport {

    public static final String UPLOADED = "UPLOADED";
    public static final String OCR_PENDING = "OCR_PENDING";
    public static final String OCR_RUNNING = "OCR_RUNNING";
    public static final String NEEDS_VERIFICATION = "NEEDS_VERIFICATION";
    public static final String VERIFIED = "VERIFIED";
    public static final String OCR_FAILED = "OCR_FAILED";
    public static final String CANCELLED = "CANCELLED";

    @Id
    @Column(name = "ReportID", nullable = false, updatable = false)
    private UUID reportId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "AppointmentID", nullable = false)
    @ToString.Exclude
    private Appointment appointment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "HealthRecordID")
    @ToString.Exclude
    private HealthRecord healthRecord;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "MedicalDocumentID")
    @ToString.Exclude
    private MedicalDocument medicalDocument;

    @Column(name = "ObjectKey", nullable = false, length = 1024, updatable = false)
    private String objectKey;

    @Column(name = "OriginalFileName", nullable = false, length = 512, updatable = false)
    private String originalFileName;

    @Column(name = "MimeType", nullable = false, length = 100, updatable = false)
    private String mimeType;

    @Column(name = "FileSize", nullable = false, updatable = false)
    private long fileSize;

    @Column(name = "Sha256", nullable = false, length = 64, updatable = false)
    private String sha256;

    @Column(name = "PageCount", nullable = false, updatable = false)
    private int pageCount;

    @Column(name = "Status", nullable = false, length = 32)
    @Builder.Default
    private String status = UPLOADED;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "UploadedByDoctorID", nullable = false)
    @ToString.Exclude
    private Doctor uploadedByDoctor;

    @Column(name = "UploadedAt", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime uploadedAt = LocalDateTime.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "VerifiedByDoctorID")
    @ToString.Exclude
    private Doctor verifiedByDoctor;

    @Column(name = "VerifiedAt")
    private LocalDateTime verifiedAt;

    @Version
    @Column(name = "RowVersion", nullable = false)
    private long rowVersion;
}
