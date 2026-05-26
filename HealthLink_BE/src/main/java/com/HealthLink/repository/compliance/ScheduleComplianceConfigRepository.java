package com.HealthLink.repository.compliance;

import com.HealthLink.entity.ScheduleComplianceConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ScheduleComplianceConfigRepository extends JpaRepository<ScheduleComplianceConfig, Integer> {

    // Find all active configs
    List<ScheduleComplianceConfig> findByActiveTrue();

    // Find global config (specialty is null)
    @Query("SELECT c FROM ScheduleComplianceConfig c WHERE c.specialty IS NULL AND c.active = true " +
           "AND (c.effectiveFrom IS NULL OR c.effectiveFrom <= :date) " +
           "AND (c.effectiveTo IS NULL OR c.effectiveTo >= :date)")
    Optional<ScheduleComplianceConfig> findActiveGlobalConfig(@Param("date") LocalDate date);

    // Find config by specialty
    @Query("SELECT c FROM ScheduleComplianceConfig c WHERE c.specialty.specialtyId = :specialtyId AND c.active = true " +
           "AND (c.effectiveFrom IS NULL OR c.effectiveFrom <= :date) " +
           "AND (c.effectiveTo IS NULL OR c.effectiveTo >= :date)")
    Optional<ScheduleComplianceConfig> findActiveConfigBySpecialty(@Param("specialtyId") Integer specialtyId,
                                                                    @Param("date") LocalDate date);

    // Find config for a doctor (by specialty, fallback to global)
    @Query("SELECT c FROM ScheduleComplianceConfig c " +
           "WHERE c.active = true " +
           "AND (c.effectiveFrom IS NULL OR c.effectiveFrom <= :date) " +
           "AND (c.effectiveTo IS NULL OR c.effectiveTo >= :date) " +
           "AND (c.specialty.specialtyId = :specialtyId OR c.specialty IS NULL) " +
           "ORDER BY CASE WHEN c.specialty IS NOT NULL THEN 0 ELSE 1 END")
    List<ScheduleComplianceConfig> findConfigsForDoctor(@Param("specialtyId") Integer specialtyId,
                                                         @Param("date") LocalDate date);

    // Find all configs with filters
    @Query("SELECT c FROM ScheduleComplianceConfig c " +
           "WHERE (:active IS NULL OR c.active = :active) " +
           "ORDER BY c.specialty.specialtyId NULLS FIRST, c.createdAt DESC")
    List<ScheduleComplianceConfig> findWithFilters(@Param("active") Boolean active);

    // Check if config exists for specialty
    boolean existsBySpecialty_SpecialtyIdAndActiveTrue(Integer specialtyId);
}
