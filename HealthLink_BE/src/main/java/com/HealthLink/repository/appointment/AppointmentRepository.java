package com.HealthLink.repository.appointment;

import com.HealthLink.entity.Appointment;
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

    // Checks for doctor schedule conflicts within a time range.
    boolean existsByDoctor_DoctorIdAndStatusNotAndAppointmentTimeBetween(
            String doctorId,
            String status,
            LocalDateTime start,
            LocalDateTime end
    );

    // Kiểm tra conflict tại slot mới, bỏ qua chính appointment đang reschedule
    boolean existsByDoctor_DoctorIdAndStatusNotAndAppointmentTimeBetweenAndAppointmentIdNot(
            String doctorId,
            String status,
            LocalDateTime start,
            LocalDateTime end,
            Integer excludeAppointmentId
    );

    List<Appointment> findByPatient_PatientId(String patientId);

    List<Appointment> findByDoctor_DoctorId(String doctorId);

    /**
     * Tìm các lịch hẹn sắp diễn ra trong khoảng thời gian cho trước và chưa gửi reminder.
     * Dùng cho @Scheduled job nhắc nhở trước 30 phút.
     *
     * @param from  Thời điểm bắt đầu cửa sổ tìm kiếm
     * @param to    Thời điểm kết thúc cửa sổ tìm kiếm
     * @return Danh sách Appointment chưa gửi reminder
     */
    @Query("SELECT a FROM Appointment a WHERE a.appointmentTime BETWEEN :from AND :to " +
           "AND a.reminderSent = false AND a.status = 'Scheduled'")
    List<Appointment> findUpcomingAndReminderNotSent(
            @Param("from") LocalDateTime from,
            @Param("to")   LocalDateTime to);

    /**
     * Đánh dấu đã gửi reminder cho một appointment.
     *
     * @param appointmentId ID lịch hẹn
     */
    @Modifying
    @Query("UPDATE Appointment a SET a.reminderSent = true WHERE a.appointmentId = :id")
    void markReminderSent(@Param("id") Integer appointmentId);
}
