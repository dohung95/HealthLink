package com.HealthLink.scheduler;

import com.HealthLink.service.compliance.ScheduleComplianceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduler for schedule compliance related tasks.
 *
 * Jobs:
 * 1. checkDailyCompliance - Daily at 8:00 AM: Check and update all compliance records
 * 2. sendMonthEndWarnings - On 25th of each month at 9:00 AM: Warn doctors about next month
 * 3. markNonCompliantDoctors - On 1st of each month at midnight: Mark non-compliant doctors
 * 4. notifyAdminNonCompliant - On 1st of each month at 10:00 AM: Notify admin about non-compliant
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ScheduleComplianceScheduler {

    private final ScheduleComplianceService complianceService;

    /**
     * Check daily compliance for all doctors.
     * Runs every day at 8:00 AM.
     */
    @Scheduled(cron = "0 0 8 * * *")
    public void checkDailyCompliance() {
        log.info("[Scheduler] Starting daily compliance check");
        try {
            complianceService.checkDailyCompliance();
            log.info("[Scheduler] Daily compliance check completed");
        } catch (Exception e) {
            log.error("[Scheduler] Error during daily compliance check: {}", e.getMessage(), e);
        }
    }

    /**
     * Send warnings to doctors about upcoming month.
     * Runs on the 25th of each month at 9:00 AM.
     */
    @Scheduled(cron = "0 0 9 25 * *")
    public void sendMonthEndWarnings() {
        log.info("[Scheduler] Starting month-end warnings");
        try {
            complianceService.sendMonthEndWarnings();
            log.info("[Scheduler] Month-end warnings completed");
        } catch (Exception e) {
            log.error("[Scheduler] Error during month-end warnings: {}", e.getMessage(), e);
        }
    }

    /**
     * Mark doctors as non-compliant for the previous month.
     * Runs on the 1st of each month at midnight.
     */
    @Scheduled(cron = "0 0 0 1 * *")
    public void markNonCompliantDoctors() {
        log.info("[Scheduler] Starting non-compliant marking");
        try {
            complianceService.markNonCompliantDoctors();
            log.info("[Scheduler] Non-compliant marking completed");
        } catch (Exception e) {
            log.error("[Scheduler] Error during non-compliant marking: {}", e.getMessage(), e);
        }
    }

    /**
     * Notify admin about non-compliant doctors.
     * Runs on the 1st of each month at 10:00 AM.
     */
    @Scheduled(cron = "0 0 10 1 * *")
    public void notifyAdminNonCompliant() {
        log.info("[Scheduler] Starting admin notification for non-compliant doctors");
        try {
            complianceService.notifyAdminNonCompliant();
            log.info("[Scheduler] Admin notification completed");
        } catch (Exception e) {
            log.error("[Scheduler] Error during admin notification: {}", e.getMessage(), e);
        }
    }
}
