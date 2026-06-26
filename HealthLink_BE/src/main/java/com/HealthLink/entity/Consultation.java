package com.HealthLink.entity;

import com.HealthLink.entity.enums.HomeVisitProposalStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "Consultations")
@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Consultation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ConsultationID")
    private Integer consultationId;

    @OneToOne
    @JoinColumn(name = "AppointmentId", nullable = false)
    @ToString.Exclude
    private Appointment appointment;

    private LocalDateTime startTime;
    private LocalDateTime endTime;

    @Column(columnDefinition = "TEXT")
    private String doctorNotes;

    @Column(columnDefinition = "TEXT")
    private String diagnosis;

    private LocalDateTime followUpDate;
    private Integer followUpAppointmentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "HomeVisitProposalStatus", length = 20)
    @Builder.Default
    private HomeVisitProposalStatus homeVisitProposalStatus = HomeVisitProposalStatus.NONE;

    @Column(name = "HomeVisitProposedAt")
    private LocalDateTime homeVisitProposedAt;

    @Column(name = "HomeVisitRespondedAt")
    private LocalDateTime homeVisitRespondedAt;

    @Column(length = 50)
    private String consultationType;

    @Column(length = 100)
    private String roomId;

    @Column(length = 500)
    private String roomUrl;

    @Column(length = 500)
    private String recordingUrl;

    private Integer duration;

    @Column(length = 2000)
    private String symptoms;

    @Column(length = 2000)
    private String treatmentPlan;

    @Column(length = 1000)
    private String followUpNotes;
}
