package com.HealthLink.repository.appointment;

import com.HealthLink.entity.AppointmentSlotHold;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;


public interface AppointmentSlotHoldRepository extends JpaRepository<AppointmentSlotHold, Integer>{
    List<AppointmentSlotHold> findByDoctor_DoctorIdAndAppointmentTimeBetweenAndExpiresAtAfter(
            String doctorId,
            LocalDateTime start,
            LocalDateTime end,
            LocalDateTime now
    );

    Optional<AppointmentSlotHold> findByDoctor_DoctorIdAndAppointmentTimeAndExpiresAtAfter(
            String doctorId,
            LocalDateTime appointmentTime,
            LocalDateTime now
    );

    boolean existsByDoctor_DoctorIdAndAppointmentTimeAndExpiresAtAfter(
            String doctorId,
            LocalDateTime appointmentTime,
            LocalDateTime now
    );

    long deleteByExpiresAtBefore(LocalDateTime now);
}
