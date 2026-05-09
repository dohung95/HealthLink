package com.HealthLink.repository.admin;

import com.HealthLink.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface AdminAppointmentRepository extends JpaRepository<Appointment, Integer>, JpaSpecificationExecutor<Appointment> {

    @Query("SELECT COUNT(a) FROM Appointment a WHERE a.appointmentTime >= :startOfDay AND a.appointmentTime < :endOfDay")
    long countTodayAppointments(@Param("startOfDay") LocalDateTime startOfDay, @Param("endOfDay") LocalDateTime endOfDay);

    @Query("SELECT COUNT(a) FROM Appointment a WHERE LOWER(a.status) = 'pending' OR LOWER(a.status) = 'scheduled'")
    long countPendingAppointments();

    @Query("SELECT COUNT(a) FROM Appointment a WHERE LOWER(a.status) = 'completed'")
    long countCompletedAppointments();

    @Query("SELECT COUNT(a) FROM Appointment a WHERE LOWER(a.status) = 'cancelled'")
    long countCancelledAppointments();
}
