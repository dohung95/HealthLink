package com.HealthLink.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "DoctorScheduleExceptions")
@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class DoctorScheduleException {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ExceptionID")
    private Integer exceptionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "DoctorId", nullable = false)
    @ToString.Exclude
    private Doctor doctor;

    @Column(nullable = false)
    private LocalDate exceptionDate;

    @Column(length = 50)
    private String exceptionType; // DayOff, Modified

    private LocalTime startTime;
    private LocalTime endTime;

    @Column(length = 500)
    private String reason;

    @Builder.Default
    private boolean recurring = false;
    
    private LocalDate recurringUntil;
}