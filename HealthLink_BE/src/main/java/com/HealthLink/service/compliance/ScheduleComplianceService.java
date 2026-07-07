package com.HealthLink.service.compliance;

import com.HealthLink.dto.compliance.*;
import com.HealthLink.entity.DoctorScheduleCompliance;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface ScheduleComplianceService {

    // ========== Doctor APIs ==========

    /**
     * Get compliance status for current month and next month
     */
    ComplianceStatusResponse getComplianceStatus(String doctorId);

    /**
     * Check compliance for a specific month
     */
    ComplianceStatusResponse checkCompliance(String doctorId, String month);

    /**
     * Validate schedule and return compliance status with warnings
     */
    ValidateScheduleResponse validateSchedule(String doctorId, ValidateScheduleRequest request);

    // ========== Admin APIs ==========

    /**
     * Get all doctors' compliance for a month with pagination
     */
    CompliancePageResponse getAllCompliance(String month, String status, Integer specialtyId, Pageable pageable);

    /**
     * Get compliance statistics for a month
     */
    ComplianceStatisticsResponse getStatistics(String month);

    /**
     * Exempt a doctor from compliance requirement
     */
    DoctorComplianceResponse exemptDoctor(String doctorId, ExemptDoctorRequest request, String adminUserId);

    /**
     * Get all compliance configs
     */
    List<ComplianceConfigResponse> getAllConfigs(Boolean active);

    /**
     * Create a new compliance config
     */
    ComplianceConfigResponse createConfig(ComplianceConfigRequest request);

    /**
     * Update a compliance config
     */
    ComplianceConfigResponse updateConfig(Integer configId, ComplianceConfigRequest request);

    /**
     * Delete a compliance config
     */
    void deleteConfig(Integer configId);

    // ========== Internal/Scheduler Methods ==========

    /**
     * Calculate scheduled hours for a doctor in a specific month
     */
    java.math.BigDecimal calculateScheduledHours(String doctorId, String month);

    /**
     * Update compliance record after schedule change
     */
    DoctorScheduleCompliance updateComplianceAfterScheduleChange(String doctorId);

    /**
     * Check and update all compliance records (called by scheduler)
     */
    void checkDailyCompliance();

    /**
     * Create a PENDING compliance record for every active doctor who doesn't have
     * one yet for the given month, so they show up in the admin compliance list
     * even if they never touched their schedule.
     */
    void initializeMissingComplianceRecords(String month);

    /**
     * Send end-of-month warnings (called by scheduler)
     */
    void sendMonthEndWarnings();

    /**
     * Mark non-compliant doctors (called by scheduler at start of new month)
     */
    void markNonCompliantDoctors();

    /**
     * Notify admin about non-compliant doctors (called by scheduler)
     */
    void notifyAdminNonCompliant();
}
