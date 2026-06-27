package com.HealthLink.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(
        name = "MedicineReminderSettings",
        uniqueConstraints = @UniqueConstraint(
                name = "UQ_MedicineReminderSettings_Patient",
                columnNames = "PatientID"
        )
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicineReminderSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "SettingID")
    private Integer settingId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PatientID", nullable = false)
    @ToString.Exclude
    private Patient patient;

    @Column(name = "MorningTime", nullable = false)
    @Builder.Default
    private LocalTime morningTime = LocalTime.of(8, 0);

    @Column(name = "AfternoonTime", nullable = false)
    @Builder.Default
    private LocalTime afternoonTime = LocalTime.of(12, 0);

    @Column(name = "EveningTime", nullable = false)
    @Builder.Default
    private LocalTime eveningTime = LocalTime.of(18, 0);

    @Column(name = "Enabled", nullable = false)
    @Builder.Default
    private Boolean enabled = true;

    @Column(name = "CreatedAt", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "UpdatedAt", nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
