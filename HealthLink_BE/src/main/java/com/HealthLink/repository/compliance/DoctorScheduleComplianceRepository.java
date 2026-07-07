package com.HealthLink.repository.compliance;

import com.HealthLink.entity.DoctorScheduleCompliance;
import com.HealthLink.entity.enums.ComplianceStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DoctorScheduleComplianceRepository extends JpaRepository<DoctorScheduleCompliance, Integer> {

    // Find by doctor and month
    Optional<DoctorScheduleCompliance> findByDoctor_DoctorIdAndComplianceMonth(String doctorId, String complianceMonth);

    // Find all by doctor
    List<DoctorScheduleCompliance> findByDoctor_DoctorIdOrderByComplianceMonthDesc(String doctorId);

    // Find by month with pagination
    Page<DoctorScheduleCompliance> findByComplianceMonth(String complianceMonth, Pageable pageable);

    // Find by month and status
    List<DoctorScheduleCompliance> findByComplianceMonthAndStatus(String complianceMonth, ComplianceStatus status);

    // Find non-compliant that admin hasn't been notified yet
    @Query("SELECT c FROM DoctorScheduleCompliance c " +
           "WHERE c.complianceMonth = :month " +
           "AND c.status = 'NON_COMPLIANT' " +
           "AND c.adminNotified = false")
    List<DoctorScheduleCompliance> findNonCompliantNotNotified(@Param("month") String month);

    // Find in-progress compliance records for a month
    @Query("SELECT c FROM DoctorScheduleCompliance c " +
           "WHERE c.complianceMonth = :month " +
           "AND c.status IN ('PENDING', 'IN_PROGRESS')")
    List<DoctorScheduleCompliance> findPendingOrInProgress(@Param("month") String month);

    // Count by status for a month
    @Query("SELECT c.status, COUNT(c) FROM DoctorScheduleCompliance c " +
           "WHERE c.complianceMonth = :month " +
           "GROUP BY c.status")
    List<Object[]> countByStatusForMonth(@Param("month") String month);

    // Find with filters
    @Query("SELECT c FROM DoctorScheduleCompliance c " +
           "WHERE c.complianceMonth = :month " +
           "AND (:status IS NULL OR c.status = :status) " +
           "AND (:specialtyId IS NULL OR c.doctor.specialtyEntity.specialtyId = :specialtyId) " +
           "ORDER BY c.scheduleActive DESC, c.scheduledHours ASC")
    Page<DoctorScheduleCompliance> findWithFilters(@Param("month") String month,
                                                    @Param("status") ComplianceStatus status,
                                                    @Param("specialtyId") Integer specialtyId,
                                                    Pageable pageable);

    // Find doctors who need warning (below threshold)
    @Query("SELECT c FROM DoctorScheduleCompliance c " +
           "WHERE c.complianceMonth = :month " +
           "AND c.status IN ('PENDING', 'IN_PROGRESS') " +
           "AND (c.scheduledHours * 100.0 / c.requiredHours) < :thresholdPercent")
    List<DoctorScheduleCompliance> findBelowThreshold(@Param("month") String month,
                                                       @Param("thresholdPercent") double thresholdPercent);

    // Check if doctor has compliance record for month
    boolean existsByDoctor_DoctorIdAndComplianceMonth(String doctorId, String complianceMonth);

    // Get total scheduled hours for all active schedules
    @Query("SELECT COALESCE(SUM(TIMESTAMPDIFF(MINUTE, ds.startTime, ds.endTime)) / 60.0, 0) " +
           "FROM DoctorSchedule ds " +
           "WHERE ds.doctor.doctorId = :doctorId " +
           "AND ds.available = true")
    Double calculateWeeklyHoursFromSchedules(@Param("doctorId") String doctorId);

    // Find all compliance records for a specific doctor
    List<DoctorScheduleCompliance> findByDoctor_DoctorId(String doctorId);

    // Find compliance records that need daily check (for scheduler)
    @Query("SELECT c FROM DoctorScheduleCompliance c " +
           "WHERE c.complianceMonth = :month " +
           "AND c.status IN ('PENDING', 'IN_PROGRESS') " +
           "AND c.scheduleActive = false")
    List<DoctorScheduleCompliance> findNeedingDailyCheck(@Param("month") String month);
}
