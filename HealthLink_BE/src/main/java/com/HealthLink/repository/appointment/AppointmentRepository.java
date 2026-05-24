package com.HealthLink.repository.appointment;

import com.HealthLink.entity.Appointment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Integer> {

    /**
     * Get all appointments of a patient, sorted by the latest first.
     */
    List<Appointment> findByPatient_PatientIdOrderByAppointmentTimeDesc(String patientId);

    @Query("""
            SELECT a FROM Appointment a
            WHERE a.patient.patientId = :patientId
            ORDER BY
                CASE WHEN UPPER(a.status) = 'CANCELLED' THEN 1 ELSE 0 END ASC,
                CASE WHEN a.appointmentTime >= :now THEN 0 ELSE 1 END ASC,
                CASE WHEN a.appointmentTime >= :now THEN a.appointmentTime ELSE null END ASC,
                CASE WHEN a.appointmentTime < :now THEN a.appointmentTime ELSE null END DESC
            """)
    Page<Appointment> findPatientAppointmentsOrdered(
            @Param("patientId") String patientId,
            @Param("now") LocalDateTime now,
            Pageable pageable
    );

    // Checks for doctor schedule conflicts within a time range.
    @Query("""
            SELECT COUNT(a) > 0 FROM Appointment a
            WHERE a.doctor.doctorId = :doctorId
              AND UPPER(a.status) <> UPPER(:status)
              AND a.appointmentTime BETWEEN :start AND :end
            """)
    boolean existsByDoctor_DoctorIdAndStatusNotAndAppointmentTimeBetween(
            @Param("doctorId") String doctorId,
            @Param("status") String status,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    @Query("""
            SELECT a FROM Appointment a
            WHERE a.doctor.doctorId = :doctorId
              AND UPPER(a.status) <> UPPER(:status)
              AND a.appointmentTime BETWEEN :start AND :end
            """)
    List<Appointment> findByDoctor_DoctorIdAndStatusNotAndAppointmentTimeBetween(
            @Param("doctorId") String doctorId,
            @Param("status") String status,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    // Kiểm tra conflict tại slot mới, bỏ qua chính appointment đang reschedule
    @Query("""
            SELECT COUNT(a) > 0 FROM Appointment a
            WHERE a.doctor.doctorId = :doctorId
              AND UPPER(a.status) <> UPPER(:status)
              AND a.appointmentTime BETWEEN :start AND :end
              AND a.appointmentId <> :excludeAppointmentId
            """)
    boolean existsByDoctor_DoctorIdAndStatusNotAndAppointmentTimeBetweenAndAppointmentIdNot(
            @Param("doctorId") String doctorId,
            @Param("status") String status,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("excludeAppointmentId") Integer excludeAppointmentId
    );

    List<Appointment> findByPatient_PatientId(String patientId);

    List<Appointment> findByDoctor_DoctorId(String doctorId);

    List<Appointment> findByDoctor_DoctorIdOrderByAppointmentTimeDesc(String doctorId);

    @Query("""
            SELECT a FROM Appointment a
            JOIN a.invoice i
            WHERE UPPER(a.status) = 'PENDINGPAYMENT'
            AND UPPER(i.status) = 'PENDING'
            AND i.issueDate < :cutoff
            """)
    List<Appointment> findExpiredPendingPaymentAppointments(@Param("cutoff") LocalDateTime cutoff);

    /**
     * Tìm các lịch hẹn sắp diễn ra trong khoảng thời gian cho trước và chưa gửi
     * reminder. Dùng cho @Scheduled job nhắc nhở trước 30 phút.
     *
     * @param from Thời điểm bắt đầu cửa sổ tìm kiếm
     * @param to Thời điểm kết thúc cửa sổ tìm kiếm
     * @return Danh sách Appointment chưa gửi reminder
     */
    @Query("SELECT a FROM Appointment a WHERE a.appointmentTime BETWEEN :from AND :to "
            + "AND a.reminderSent = false AND UPPER(a.status) = 'SCHEDULED'")
    List<Appointment> findUpcomingAndReminderNotSent(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    @Query("SELECT a FROM Appointment a WHERE a.appointmentTime BETWEEN :from AND :to "
            + "AND (a.doctorReminderSent IS NULL OR a.doctorReminderSent = false) "
            + "AND UPPER(a.status) = 'SCHEDULED'")
    List<Appointment> findUpcomingDoctorReminderCandidates(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    /**
     * Đánh dấu đã gửi reminder cho một appointment.
     *
     * @param appointmentId ID lịch hẹn
     */
    @Modifying
    @Query("UPDATE Appointment a SET a.reminderSent = true WHERE a.appointmentId = :id")
    void markReminderSent(@Param("id") Integer appointmentId);

    @Modifying
    @Query("UPDATE Appointment a SET a.doctorReminderSent = true WHERE a.appointmentId = :id")
    void markDoctorReminderSent(@Param("id") Integer appointmentId);
}
