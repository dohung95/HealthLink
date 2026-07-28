package com.HealthLink.entity.ai;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "LabObservations")
@Getter
@Setter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class LabObservation {

    public static final String UNVERIFIED = "UNVERIFIED";
    public static final String VERIFIED = "VERIFIED";
    public static final String REJECTED = "REJECTED";

    @Id
    @Column(name = "ObservationID", nullable = false, updatable = false)
    private UUID observationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ReportID", nullable = false)
    @ToString.Exclude
    private LabReport report;

    @Column(name = "RowOrder", nullable = false)
    private Integer rowOrder;

    @Column(name = "TestNameRaw", nullable = false, length = 500)
    private String testNameRaw;

    @Column(name = "TestNameNormalized", length = 500)
    private String testNameNormalized;

    @Column(name = "LoincCode", length = 32)
    private String loincCode;

    @Column(name = "ValueText", nullable = false, length = 500)
    private String valueText;

    @Column(name = "NumericValue", precision = 18, scale = 6)
    private BigDecimal numericValue;

    @Column(name = "Comparator", length = 8)
    private String comparator;

    @Column(name = "UnitRaw", length = 100)
    private String unitRaw;

    @Column(name = "UnitUcum", length = 100)
    private String unitUcum;

    @Column(name = "ReferenceLow", precision = 18, scale = 6)
    private BigDecimal referenceLow;

    @Column(name = "ReferenceHigh", precision = 18, scale = 6)
    private BigDecimal referenceHigh;

    @Column(name = "ReferenceText", length = 500)
    private String referenceText;

    @Column(name = "AbnormalFlag", length = 32)
    private String abnormalFlag;

    @Column(name = "OcrConfidence", precision = 5, scale = 4)
    private BigDecimal ocrConfidence;

    @Column(name = "VerificationStatus", nullable = false, length = 16)
    @Builder.Default
    private String verificationStatus = UNVERIFIED;

    @Column(name = "DoctorCorrected", nullable = false)
    @Builder.Default
    private boolean doctorCorrected = false;

    @Column(name = "SourcePage")
    private Integer sourcePage;

    @Column(name = "SourceBoundingBoxJson", columnDefinition = "NVARCHAR(MAX)")
    private String sourceBoundingBoxJson;

    @Column(name = "CreatedAt", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "UpdatedAt", nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
