package com.HealthLink.entity.ai;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "LabObservationRevisions")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class LabObservationRevision {
    @Id
    @Column(name = "RevisionID", nullable = false, updatable = false)
    private UUID revisionId;
    @Column(name = "ReportID", nullable = false, updatable = false)
    private UUID reportId;
    @Column(name = "ObservationID", nullable = false, updatable = false)
    private UUID observationId;
    @Column(name = "DoctorID", nullable = false, length = 450, updatable = false)
    private String doctorId;
    @Column(name = "ChangedFieldsJson", nullable = false, columnDefinition = "NVARCHAR(MAX)", updatable = false)
    private String changedFieldsJson;
    @Column(name = "BeforeHash", nullable = false, length = 64, updatable = false)
    private String beforeHash;
    @Column(name = "AfterHash", nullable = false, length = 64, updatable = false)
    private String afterHash;
    @Column(name = "CreatedAt", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
