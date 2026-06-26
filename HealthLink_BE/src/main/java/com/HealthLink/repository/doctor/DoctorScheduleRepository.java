package com.HealthLink.repository.doctor;

import com.HealthLink.entity.DoctorSchedule;
import com.HealthLink.entity.enums.DoctorScheduleStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

// Dùng để kiểm tra ca làm việc của bác sĩ khi đặt lịch
@Repository
public interface DoctorScheduleRepository extends JpaRepository<DoctorSchedule, Integer> {

    /**
     * Lấy tất cả ca làm việc khả dụng của bác sĩ trong một ngày cụ thể.
     *
     * @param doctorId  ID bác sĩ
     * @param dayOfWeek ngày trong tuần (0=CN, 1=T2 ... 6=T7)
     */
    List<DoctorSchedule> findByDoctor_DoctorIdAndDayOfWeekAndAvailableTrue(
            String doctorId, Integer dayOfWeek);

    List<DoctorSchedule> findByDoctor_DoctorIdAndDayOfWeekAndAvailableTrueAndScheduleStatus(
            String doctorId, Integer dayOfWeek, DoctorScheduleStatus scheduleStatus);

    /**
     * Lấy toàn bộ lịch làm việc của bác sĩ (dùng để hiển thị).
     */
    List<DoctorSchedule> findByDoctor_DoctorId(String doctorId);

    List<DoctorSchedule> findByDoctor_DoctorIdAndScheduleStatus(String doctorId, DoctorScheduleStatus scheduleStatus);
}
