package com.HealthLink.scheduler;

import com.HealthLink.service.doctor.DoctorScheduleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduler for doctor schedule monthly rollover checks.
 *
 * Jobs:
 * 1. runMonthlyReconfirmationCheck - On the 1st of each month at 00:30: doctors whose schedule
 *    met last month's quota and still carries over into the new month are moved back to PENDING
 *    and asked to reconfirm; doctors who didn't meet the quota are reminded to add more hours.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DoctorScheduleMonthlyScheduler {

    private final DoctorScheduleService scheduleService;

    @Scheduled(cron = "0 30 0 1 * *")
    public void runMonthlyReconfirmationCheck() {
        log.info("[Scheduler] Starting doctor schedule monthly reconfirmation check");
        try {
            scheduleService.runMonthlyReconfirmationCheck();
            log.info("[Scheduler] Doctor schedule monthly reconfirmation check completed");
        } catch (Exception e) {
            log.error("[Scheduler] Error during monthly reconfirmation check: {}", e.getMessage(), e);
        }
    }
}
