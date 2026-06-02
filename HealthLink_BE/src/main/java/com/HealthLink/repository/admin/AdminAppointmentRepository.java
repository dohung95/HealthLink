package com.HealthLink.repository.admin;

import com.HealthLink.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface AdminAppointmentRepository extends JpaRepository<Appointment, Integer>, JpaSpecificationExecutor<Appointment> {

    @Query("SELECT COUNT(a) FROM Appointment a WHERE a.appointmentTime >= :startOfDay AND a.appointmentTime < :endOfDay")
    long countTodayAppointments(@Param("startOfDay") LocalDateTime startOfDay, @Param("endOfDay") LocalDateTime endOfDay);

    @Query("SELECT COUNT(a) FROM Appointment a WHERE a.status = 'SCHEDULED' OR a.status = 'IN_CONSULTATION'")
    long countPendingAppointments();

    @Query("SELECT COUNT(a) FROM Appointment a WHERE a.status = 'COMPLETED'")
    long countCompletedAppointments();

    @Query("SELECT COUNT(a) FROM Appointment a WHERE a.status = 'CANCELLED'")
    long countCancelledAppointments();

    // ========== Doctor Appointment Statistics ==========

    // Count by doctor, status category, and online/offline
    @Query("SELECT COUNT(a) FROM Appointment a WHERE a.doctor.doctorId = :doctorId " +
           "AND a.status IN :statuses " +
           "AND UPPER(a.consultationType) IN :consultationTypes")
    Integer countByDoctorAndStatusAndType(
        @Param("doctorId") String doctorId,
        @Param("statuses") List<String> statuses,
        @Param("consultationTypes") List<String> consultationTypes);

    // Sum fee by doctor, status category, and online/offline
    @Query("SELECT COALESCE(SUM(a.fee), 0) FROM Appointment a WHERE a.doctor.doctorId = :doctorId " +
           "AND a.status IN :statuses " +
           "AND UPPER(a.consultationType) IN :consultationTypes")
    BigDecimal sumFeeByDoctorAndStatusAndType(
        @Param("doctorId") String doctorId,
        @Param("statuses") List<String> statuses,
        @Param("consultationTypes") List<String> consultationTypes);
}
