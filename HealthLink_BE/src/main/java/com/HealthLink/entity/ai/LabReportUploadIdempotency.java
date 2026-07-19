package com.HealthLink.entity.ai;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "LabReportUploadIdempotencies", uniqueConstraints = @UniqueConstraint(
        name = "UQ_LabReportUploadIdempotencies_Scope_Key",
        columnNames = {"AppointmentID", "DoctorID", "IdempotencyKey"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class LabReportUploadIdempotency {
    @Id
    @Column(name = "UploadId", nullable = false, updatable = false)
    private UUID uploadId;

    @Column(name = "AppointmentID", nullable = false, updatable = false)
    private Integer appointmentId;

    @Column(name = "DoctorID", nullable = false, length = 450, updatable = false)
    private String doctorId;

    @Column(name = "IdempotencyKey", nullable = false, length = 200, updatable = false)
    private String idempotencyKey;

    @Column(name = "ReportID", nullable = false, updatable = false)
    private UUID reportId;

    @Column(name = "JobID", nullable = false, updatable = false)
    private UUID jobId;

    @Column(name = "CreatedAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public static LabReportUploadIdempotency completed(Integer appointmentId, String doctorId,
                                                       String idempotencyKey, UUID reportId, UUID jobId) {
        return new LabReportUploadIdempotency(UUID.randomUUID(), appointmentId, doctorId, idempotencyKey,
                reportId, jobId, LocalDateTime.now());
    }
}
