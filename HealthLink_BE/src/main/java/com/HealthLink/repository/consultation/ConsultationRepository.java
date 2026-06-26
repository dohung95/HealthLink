package com.HealthLink.repository.consultation;

import com.HealthLink.entity.Consultation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ConsultationRepository extends JpaRepository<Consultation, Integer> {

    Optional<Consultation> findByAppointment_AppointmentId(Integer appointmentId);

    /**
     * Tìm các Consultation có followUpDate rơi trong khoảng thời gian xác định.
     * Dùng cho @Scheduled job nhắc lịch tái khám (quét mỗi ngày lúc 8:00 sáng).
     *
     * @param from Thời điểm bắt đầu cửa sổ tìm kiếm
     * @param to   Thời điểm kết thúc cửa sổ tìm kiếm
     * @return Danh sách Consultation cần nhắc tái khám
     */
    @Query("SELECT c FROM Consultation c WHERE c.followUpDate BETWEEN :from AND :to")
    List<Consultation> findFollowUpsDueForReminder(
            @Param("from") LocalDateTime from,
            @Param("to")   LocalDateTime to);
}
