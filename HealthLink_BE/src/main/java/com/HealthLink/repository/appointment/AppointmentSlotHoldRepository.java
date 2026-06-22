package com.HealthLink.repository.appointment;

import com.HealthLink.entity.AppointmentSlotHold;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AppointmentSlotHoldRepository extends JpaRepository<AppointmentSlotHold, Integer> {

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

    @Query("""
        SELECT COUNT(h) > 0 FROM AppointmentSlotHold h
        WHERE h.doctor.doctorId = :doctorId
          AND h.expiresAt > :now
          AND h.appointmentTime < :end
          AND COALESCE(h.endTime, h.appointmentTime) > :start
        """)
    boolean existsDoctorHoldOverlap(
            @Param("doctorId") String doctorId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("now") LocalDateTime now
    );

    @Query("""
        SELECT h FROM AppointmentSlotHold h
        WHERE h.doctor.doctorId = :doctorId
          AND h.expiresAt > :now
          AND h.appointmentTime < :end
          AND COALESCE(h.endTime, h.appointmentTime) > :start
        """)
    List<AppointmentSlotHold> findDoctorHoldOverlaps(
            @Param("doctorId") String doctorId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("now") LocalDateTime now
    );
}
