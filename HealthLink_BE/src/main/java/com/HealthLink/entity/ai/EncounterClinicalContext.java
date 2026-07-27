package com.HealthLink.entity.ai;

import com.HealthLink.entity.Appointment;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Nationalized;
import java.time.LocalDateTime;

@Entity
@Table(name = "EncounterClinicalContexts")
@Getter @Setter @Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class EncounterClinicalContext {
    @Id
    @Column(name = "AppointmentID", nullable = false)
    private Integer appointmentId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "AppointmentID", nullable = false)
    @ToString.Exclude
    private Appointment appointment;

    @Nationalized
    @Column(name = "DoctorSymptoms", length = 4000)
    private String doctorSymptoms;

    @Nationalized
    @Column(name = "WorkingDiagnosis", length = 2000)
    private String workingDiagnosis;

    @Column(name = "FastingStatus", length = 32)
    private String fastingStatus;

    @Column(name = "PregnancyStatus", length = 32)
    private String pregnancyStatus;

    @Column(name = "CreatedAt", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "UpdatedAt", nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Version
    @Column(name = "RowVersion", nullable = false)
    private long rowVersion;
}
