package com.HealthLink.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import lombok.*;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "HomeVisitDrafts", indexes = {
    @Index(name = "IX_HomeVisitDrafts_ExpiresAt", columnList = "ExpiresAt")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HomeVisitDraft {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "Id")
    private Integer id;

    @Column(name = "PatientId", length = 450, nullable = false)
    private String patientId;

    @Column(name = "DoctorId", length = 450, nullable = false)
    private String doctorId;

    @Column(name = "AppointmentId")
    private Integer appointmentId;

    @Column(name = "VisitAddress", length = 500, nullable = false)
    private String visitAddress;

    @Column(name = "VisitLatitude")
    private Double visitLatitude;

    @Column(name = "VisitLongitude")
    private Double visitLongitude;

    @Column(name = "ContactPhone", length = 20, nullable = false)
    private String contactPhone;

    @Column(name = "ReasonForHomeVisit", length = 500)
    private String reasonForHomeVisit;

    @Column(name = "SpecialNotes", length = 500)
    private String specialNotes;

    @Column(name = "CreatedAt", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "ExpiresAt", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "ScheduleId")
    private Integer scheduleId;

    @Column(name = "BookingDate")
    private LocalDate bookingDate;

    @Column(name = "StartTime")
    private LocalTime startTime;

    @Column(name = "EndTime")
    private LocalTime endTime;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
