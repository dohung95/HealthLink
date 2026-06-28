package com.HealthLink.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "HomeVisitBookings", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"DoctorId", "ScheduleId", "BookingDate", "StartTime", "EndTime"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HomeVisitBooking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "Id")
    private Integer id;

    @Column(name = "DoctorId", length = 450, nullable = false)
    private String doctorId;

    @Column(name = "ScheduleId", nullable = false)
    private Integer scheduleId;

    @Column(name = "BookingDate", nullable = false)
    private LocalDate bookingDate;

    @Column(name = "AppointmentId", nullable = false, unique = true)
    private Integer appointmentId;

    @Column(name = "CreatedAt", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "StartTime", nullable = false)
    private LocalTime startTime;

    @Column(name = "EndTime", nullable = false)
    private LocalTime endTime;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
