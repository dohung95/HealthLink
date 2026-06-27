package com.HealthLink.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(
        name = "MedicineReminderDispatchLogs",
        uniqueConstraints = @UniqueConstraint(
                name = "UQ_MedicineReminderDispatchLogs_Patient_Date_Timing",
                columnNames = {"PatientID", "ReminderDate", "Timing"}
        )
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicineReminderDispatchLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "DispatchLogID")
    private Integer dispatchLogId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PatientID", nullable = false)
    @ToString.Exclude
    private Patient patient;

    @Column(name = "ReminderDate", nullable = false)
    private LocalDate reminderDate;

    @Column(name = "Timing", nullable = false, length = 20)
    private String timing;

    @Column(name = "ScheduledTime", nullable = false)
    private LocalTime scheduledTime;

    @Column(name = "SentAt", nullable = false)
    private LocalDateTime sentAt;
}
