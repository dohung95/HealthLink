package com.HealthLink.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "Reviews")
@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Review {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ReviewID")
    private Integer reviewId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PatientID", nullable = false)
    @ToString.Exclude
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "DoctorID", nullable = false)
    @ToString.Exclude
    private Doctor doctor;

    @Column(nullable = false)
    private Integer rating;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String comment;

    @Column(nullable = false)
    private LocalDateTime reviewDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "AppointmentId")
    @ToString.Exclude
    private Appointment appointment;

    @Column(name = "IsAnonymous")
    @Builder.Default
    private boolean isAnonymous = false;

    @Column(name = "DoctorReply", length = 1000)
    private String doctorReply;

    @Column(name = "DoctorReplyDate")
    private LocalDateTime doctorReplyDate;
    
    @Column(name = "IsVisible")
    @Builder.Default
    private boolean isVisible = true;

    @Column(name = "HelpfulCount")
    @Builder.Default
    private Integer helpfulCount = 0;
}