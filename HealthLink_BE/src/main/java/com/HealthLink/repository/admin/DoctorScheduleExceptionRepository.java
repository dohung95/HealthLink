package com.HealthLink.repository.admin;

import com.HealthLink.entity.DoctorScheduleException;
import com.HealthLink.entity.enums.ScheduleExceptionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface DoctorScheduleExceptionRepository extends JpaRepository<DoctorScheduleException, Integer> {

    /**
     * Lấy tất cả exception của một bác sĩ.
     */
    List<DoctorScheduleException> findByDoctor_DoctorId(String doctorId);

    /**
     * Lấy exception của bác sĩ trong một ngày cụ thể.
     */
    Optional<DoctorScheduleException> findByDoctor_DoctorIdAndExceptionDate(
            String doctorId, LocalDate exceptionDate);

    /**
     * Lấy exceptions của bác sĩ trong khoảng thời gian.
     */
    List<DoctorScheduleException> findByDoctor_DoctorIdAndExceptionDateBetween(
            String doctorId, LocalDate startDate, LocalDate endDate);

    /**
     * Lấy tất cả exceptions trong khoảng thời gian (cho Admin view).
     */
    List<DoctorScheduleException> findByExceptionDateBetween(
            LocalDate startDate, LocalDate endDate);

    /**
     * Lấy exceptions theo loại (DayOff, Modified, AddSlot).
     */
    List<DoctorScheduleException> findByDoctor_DoctorIdAndExceptionType(
            String doctorId, ScheduleExceptionType exceptionType);

    /**
     * Kiểm tra bác sĩ có exception trong ngày không (dùng cho booking validation).
     */
    boolean existsByDoctor_DoctorIdAndExceptionDateAndExceptionType(
            String doctorId, LocalDate exceptionDate, ScheduleExceptionType exceptionType);

    /**
     * Lấy exceptions do Admin tạo (reason chứa [Admin]).
     */
    @Query("SELECT e FROM DoctorScheduleException e WHERE e.doctor.doctorId = :doctorId AND e.reason LIKE '%[Admin]%'")
    List<DoctorScheduleException> findAdminCreatedExceptions(@Param("doctorId") String doctorId);

    /**
     * Xóa tất cả exceptions của bác sĩ trong một ngày.
     */
    void deleteByDoctor_DoctorIdAndExceptionDate(String doctorId, LocalDate exceptionDate);
}
