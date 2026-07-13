package com.HealthLink.repository.consultation;

import com.HealthLink.entity.Consultation;
import com.HealthLink.entity.enums.HomeVisitProposalStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ConsultationRepository extends JpaRepository<Consultation, Integer> {

    Optional<Consultation> findByAppointment_AppointmentId(Integer appointmentId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Consultation c WHERE c.appointment.appointmentId = :appointmentId")
    Optional<Consultation> findByAppointmentIdForUpdate(@Param("appointmentId") Integer appointmentId);

    @Query("SELECT c FROM Consultation c WHERE c.followUpDate > :now AND c.followUpAppointmentId IS NULL")
    List<Consultation> findFutureFollowUpsWithoutAppointment(@Param("now") LocalDateTime now);

    Optional<Consultation> findFirstByAppointment_Patient_User_IdAndHomeVisitProposalStatusOrderByHomeVisitProposedAtDesc(
            String userId,
            HomeVisitProposalStatus status
    );

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
