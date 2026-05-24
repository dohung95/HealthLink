package com.HealthLink.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "PrescriptionReminderLogs",
        uniqueConstraints = @UniqueConstraint(
                name = "UQ_PrescriptionReminderLog_Header_Date_Timing",
                columnNames = {"PrescriptionHeaderID", "ReminderDate", "Timing"}
        )
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrescriptionReminderLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ReminderLogID")
    private Integer reminderLogId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PrescriptionHeaderID", nullable = false)
    @ToString.Exclude
    private PrescriptionHeader prescriptionHeader;

    @Column(name = "ReminderDate", nullable = false)
    private LocalDate reminderDate;

    @Column(name = "Timing", nullable = false, length = 20)
    private String timing;

    @Column(name = "SentAt", nullable = false)
    @Builder.Default
    private LocalDateTime sentAt = LocalDateTime.now();
}
