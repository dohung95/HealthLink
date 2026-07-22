package com.HealthLink.entity.ai;

import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Doctor;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "ClinicalContextSnapshots")
@Getter @Setter @Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class ClinicalContextSnapshot {
    @Id
    @Column(name = "SnapshotID", nullable = false, updatable = false)
    private UUID snapshotId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "AppointmentID", nullable = false, updatable = false)
    @ToString.Exclude
    private Appointment appointment;

    @Column(name = "ContextVersion", nullable = false, updatable = false)
    private long contextVersion;

    @Column(name = "CanonicalJson", nullable = false, columnDefinition = "NVARCHAR(MAX)", updatable = false)
    private String canonicalJson;

    @Column(name = "Sha256", nullable = false, length = 64, updatable = false)
    private String sha256;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "CreatedByDoctorID", nullable = false, updatable = false)
    @ToString.Exclude
    private Doctor createdByDoctor;

    @Column(name = "CreatedAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
