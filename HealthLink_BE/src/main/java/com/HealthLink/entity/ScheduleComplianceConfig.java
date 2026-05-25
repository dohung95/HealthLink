package com.HealthLink.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "ScheduleComplianceConfigs")
@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ScheduleComplianceConfig {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ConfigID")
    private Integer configId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "SpecialtyId")
    @ToString.Exclude
    private Specialty specialty; // null = global config

    @Column(name = "MinHoursPerMonth", nullable = false)
    private Integer minHoursPerMonth; // VD: 40

    @Column(name = "WarningThresholdPercent")
    @Builder.Default
    private Integer warningThresholdPercent = 80; // Cảnh báo khi đạt 80%

    @Column(length = 500)
    private String description;

    @Column(name = "Active")
    @Builder.Default
    private boolean active = true;

    @Column(name = "EffectiveFrom")
    private LocalDate effectiveFrom;

    @Column(name = "EffectiveTo")
    private LocalDate effectiveTo;

    @Column(name = "CreatedAt")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "UpdatedAt")
    private LocalDateTime updatedAt;

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
