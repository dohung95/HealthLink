package com.HealthLink.scheduler;

import com.HealthLink.service.compliance.ScheduleComplianceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/**
 * Runs once right after the backend boots (e.g. after a restart / DB reset) so the
 * "Doctor Schedules & Compliance" admin list is complete immediately, instead of waiting
 * for the 8:00 AM daily cron ({@link ScheduleComplianceScheduler#checkDailyCompliance()})
 * or for an admin to hit the trigger-check endpoint.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ScheduleComplianceStartupInitializer implements ApplicationRunner {

    private static final DateTimeFormatter MONTH_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM");

    private final ScheduleComplianceService complianceService;

    @Override
    public void run(ApplicationArguments args) {
        String currentMonth = LocalDate.now().format(MONTH_FORMATTER);
        try {
            log.info("[Startup] Backfilling missing compliance records for {}", currentMonth);
            complianceService.initializeMissingComplianceRecords(currentMonth);
        } catch (Exception e) {
            log.error("[Startup] Error backfilling compliance records for {}: {}", currentMonth, e.getMessage(), e);
        }
    }
}
