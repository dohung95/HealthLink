package com.HealthLink.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "AdminScheduleAuditLogs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminScheduleAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "LogId")
    private Long logId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "AdminUserId", nullable = false)
    @ToString.Exclude
    private User adminUser;

    @Column(name = "ActionType", length = 50, nullable = false)
    private String actionType; // BLOCK_SLOT, UNBLOCK_SLOT, CANCEL_APPOINTMENT, REASSIGN_APPOINTMENT

    @Column(name = "TargetDoctorId", length = 450)
    private String targetDoctorId;

    @Column(name = "TargetAppointmentId")
    private Integer targetAppointmentId;

    @Column(name = "TargetPatientId", length = 450)
    private String targetPatientId;

    @Column(name = "Description", length = 1000)
    private String description;

    @Column(name = "OldValue", length = 2000)
    private String oldValue; // JSON format for old state

    @Column(name = "NewValue", length = 2000)
    private String newValue; // JSON format for new state

    @Column(name = "Reason", length = 500)
    private String reason;

    @Builder.Default
    @Column(name = "CreatedAt", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "IpAddress", length = 50)
    private String ipAddress;
}
