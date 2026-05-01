package com.HealthLink.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "Consultations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Consultation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ConsultationID")
    private Integer consultationId;

    @Column(name = "AppointmentID", nullable = false)
    private Integer appointmentId;

    @Column(name = "StartTime")
    private LocalDateTime startTime;

    @Column(name = "EndTime")
    private LocalDateTime endTime;

    @Column(name = "DoctorNotes")
    private String doctorNotes;

    @Column(name = "Diagnosis")
    private String diagnosis;

    @Column(name = "FollowUpDate")
    private LocalDateTime followUpDate;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "AppointmentID", insertable = false, updatable = false)
    private Appointment appointment;
}
