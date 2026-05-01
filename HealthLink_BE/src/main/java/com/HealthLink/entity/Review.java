package com.HealthLink.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "Reviews")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ReviewID")
    private Integer reviewId;

    @Column(name = "PatientID", nullable = false, length = 450)
    private String patientId;

    @Column(name = "DoctorID", nullable = false, length = 450)
    private String doctorId;

    @Column(name = "Rating", nullable = false)
    private Integer rating;

    @Column(name = "Comment", nullable = false)
    private String comment;

    @Column(name = "ReviewDate", nullable = false)
    private LocalDateTime reviewDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PatientID", insertable = false, updatable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "DoctorID", insertable = false, updatable = false)
    private Doctor doctor;

    @PrePersist
    protected void onCreate() {
        if (reviewDate == null) {
            reviewDate = LocalDateTime.now();
        }
    }
}
