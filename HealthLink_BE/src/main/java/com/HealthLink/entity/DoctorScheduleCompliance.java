package com.HealthLink.entity;

import com.HealthLink.entity.enums.ComplianceStatus;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "DoctorScheduleCompliance",
       uniqueConstraints = @UniqueConstraint(columnNames = {"DoctorId", "ComplianceMonth"}))
@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class DoctorScheduleCompliance {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ComplianceID")
    private Integer complianceId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "DoctorId", nullable = false)
    @ToString.Exclude
    private Doctor doctor;

    @Column(name = "ComplianceMonth", length = 7, nullable = false)
    private String complianceMonth; // "2026-06"

    @Column(name = "RequiredHours", nullable = false)
    private Integer requiredHours;

    @Column(name = "ScheduledHours", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal scheduledHours = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "Status", length = 20)
    @Builder.Default
    private ComplianceStatus status = ComplianceStatus.PENDING;

    @Column(name = "ScheduleActive")
    @Builder.Default
    private boolean scheduleActive = false; // true khi đủ giờ

    @Column(name = "LastNotificationSent")
    private LocalDateTime lastNotificationSent;

    @Column(name = "AdminNotified")
    @Builder.Default
    private boolean adminNotified = false;

    @Column(length = 1000)
    private String notes;

    @Column(name = "ExemptedBy")
    private String exemptedBy; // Admin user ID who exempted

    @Column(name = "ExemptedAt")
    private LocalDateTime exemptedAt;

    @Column(name = "ExemptReason", length = 500)
    private String exemptReason;

    @Column(name = "CreatedAt")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "UpdatedAt")
    private LocalDateTime updatedAt;

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Helper method to calculate compliance percentage
    public double getCompliancePercentage() {
        if (requiredHours == null || requiredHours == 0) {
            return 100.0;
        }
        return scheduledHours.doubleValue() / requiredHours * 100;
    }

    // Helper method to check if compliant
    public boolean isCompliant() {
        return getCompliancePercentage() >= 100.0;
    }
}
