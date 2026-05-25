package com.HealthLink.service.impl.compliance;

import com.HealthLink.dto.compliance.*;
import com.HealthLink.entity.*;
import com.HealthLink.entity.enums.ComplianceStatus;
import com.HealthLink.entity.enums.NotificationPriority;
import com.HealthLink.entity.enums.NotificationType;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.admin.DoctorScheduleExceptionRepository;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.repository.compliance.DoctorScheduleComplianceRepository;
import com.HealthLink.repository.compliance.ScheduleComplianceConfigRepository;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.repository.doctor.DoctorScheduleRepository;
import com.HealthLink.service.admin.AdminNotificationService;
import com.HealthLink.service.compliance.ScheduleComplianceService;
import com.HealthLink.service.notification.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ScheduleComplianceServiceImpl implements ScheduleComplianceService {

    private final DoctorScheduleComplianceRepository complianceRepository;
    private final ScheduleComplianceConfigRepository configRepository;
    private final DoctorScheduleRepository scheduleRepository;
    private final DoctorScheduleExceptionRepository exceptionRepository;
    private final DoctorRepository doctorRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final AdminNotificationService adminNotificationService;

    private static final DateTimeFormatter MONTH_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM");

    // ========== Doctor APIs ==========

    @Override
    @Transactional(readOnly = true)
    public ComplianceStatusResponse getComplianceStatus(String doctorId) {
        Doctor doctor = findDoctor(doctorId);
        String currentMonth = LocalDate.now().format(MONTH_FORMATTER);
        String nextMonth = LocalDate.now().plusMonths(1).format(MONTH_FORMATTER);

        ComplianceStatusResponse currentStatus = buildComplianceStatus(doctor, currentMonth);
        ComplianceStatusResponse nextStatus = buildComplianceStatus(doctor, nextMonth);

        currentStatus.setNextMonthStatus(nextStatus);
        return currentStatus;
    }

    @Override
    @Transactional(readOnly = true)
    public ComplianceStatusResponse checkCompliance(String doctorId, String month) {
        Doctor doctor = findDoctor(doctorId);
        validateMonthFormat(month);
        return buildComplianceStatus(doctor, month);
    }

    @Override
    public ValidateScheduleResponse validateSchedule(String doctorId, ValidateScheduleRequest request) {
        Doctor doctor = findDoctor(doctorId);
        String targetMonth = request != null && request.getTargetMonth() != null
                ? request.getTargetMonth()
                : LocalDate.now().format(MONTH_FORMATTER);

        validateMonthFormat(targetMonth);

        // Calculate scheduled hours
        BigDecimal scheduledHours = calculateScheduledHours(doctorId, targetMonth);

        // Get required hours from config
        int requiredHours = getRequiredHoursForDoctor(doctor, targetMonth);

        // Calculate compliance
        double percentage = requiredHours > 0
                ? scheduledHours.doubleValue() / requiredHours * 100
                : 100.0;
        boolean isCompliant = percentage >= 100.0;

        BigDecimal hoursShortfall = isCompliant
                ? BigDecimal.ZERO
                : BigDecimal.valueOf(requiredHours).subtract(scheduledHours);

        // Determine status
        ComplianceStatus status;
        if (isCompliant) {
            status = ComplianceStatus.COMPLIANT;
        } else if (scheduledHours.compareTo(BigDecimal.ZERO) == 0) {
            status = ComplianceStatus.PENDING;
        } else {
            status = ComplianceStatus.IN_PROGRESS;
        }

        // Build warnings and suggestions
        List<String> warnings = new ArrayList<>();
        List<String> suggestions = new ArrayList<>();

        if (!isCompliant) {
            warnings.add(String.format("You have scheduled %.1f hours but need %d hours for %s",
                    scheduledHours.doubleValue(), requiredHours, targetMonth));

            if (percentage < 50) {
                warnings.add("Your schedule is significantly below the required hours");
            }

            suggestions.add(String.format("Add %.1f more hours to meet the requirement",
                    hoursShortfall.doubleValue()));
            suggestions.add("Consider adding more working days or extending your daily hours");
        }

        // Update or create compliance record
        DoctorScheduleCompliance compliance = getOrCreateCompliance(doctor, targetMonth, requiredHours);
        compliance.setScheduledHours(scheduledHours);
        compliance.setStatus(status);
        compliance.setScheduleActive(isCompliant);
        complianceRepository.save(compliance);

        // Send notification if not compliant
        if (!isCompliant && doctor.getUser() != null) {
            sendComplianceWarningNotification(doctor, targetMonth, scheduledHours, requiredHours);
        }

        String message = isCompliant
                ? "Your schedule meets the compliance requirement. Schedule is active."
                : "Your schedule does not meet the minimum hours requirement. Schedule will remain inactive until requirement is met.";

        return ValidateScheduleResponse.builder()
                .compliant(isCompliant)
                .complianceMonth(targetMonth)
                .requiredHours(requiredHours)
                .scheduledHours(scheduledHours)
                .hoursShortfall(hoursShortfall)
                .compliancePercentage(Math.min(percentage, 100.0))
                .status(status)
                .scheduleActive(isCompliant)
                .message(message)
                .warnings(warnings)
                .suggestions(suggestions)
                .build();
    }

    // ========== Admin APIs ==========

    @Override
    @Transactional(readOnly = true)
    public CompliancePageResponse getAllCompliance(String month, String status, Integer specialtyId, Pageable pageable) {
        validateMonthFormat(month);

        ComplianceStatus statusEnum = null;
        if (status != null && !status.isEmpty()) {
            try {
                statusEnum = ComplianceStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Invalid status: " + status);
            }
        }

        Page<DoctorScheduleCompliance> page = complianceRepository.findWithFilters(
                month, statusEnum, specialtyId, pageable);

        List<DoctorComplianceResponse> data = page.getContent().stream()
                .map(this::mapToComplianceResponse)
                .collect(Collectors.toList());

        return CompliancePageResponse.builder()
                .data(data)
                .currentPage(page.getNumber() + 1)
                .totalPages(page.getTotalPages())
                .totalElements(page.getTotalElements())
                .pageSize(page.getSize())
                .hasNext(page.hasNext())
                .hasPrevious(page.hasPrevious())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public ComplianceStatisticsResponse getStatistics(String month) {
        validateMonthFormat(month);

        List<Object[]> statusCounts = complianceRepository.countByStatusForMonth(month);

        int compliantCount = 0, inProgressCount = 0, pendingCount = 0, nonCompliantCount = 0, exemptedCount = 0;
        int totalDoctors = 0;

        for (Object[] row : statusCounts) {
            ComplianceStatus stat = (ComplianceStatus) row[0];
            int count = ((Number) row[1]).intValue();
            totalDoctors += count;

            switch (stat) {
                case COMPLIANT -> compliantCount = count;
                case IN_PROGRESS -> inProgressCount = count;
                case PENDING -> pendingCount = count;
                case NON_COMPLIANT -> nonCompliantCount = count;
                case EXEMPTED -> exemptedCount = count;
            }
        }

        double compliantPercentage = totalDoctors > 0
                ? (double) compliantCount / totalDoctors * 100
                : 0.0;

        return ComplianceStatisticsResponse.builder()
                .complianceMonth(month)
                .totalDoctors(totalDoctors)
                .compliantCount(compliantCount)
                .inProgressCount(inProgressCount)
                .pendingCount(pendingCount)
                .nonCompliantCount(nonCompliantCount)
                .exemptedCount(exemptedCount)
                .compliantPercentage(Math.round(compliantPercentage * 10) / 10.0)
                .build();
    }

    @Override
    public DoctorComplianceResponse exemptDoctor(String doctorId, ExemptDoctorRequest request, String adminUserId) {
        Doctor doctor = findDoctor(doctorId);
        String month = request.getComplianceMonth();
        validateMonthFormat(month);

        DoctorScheduleCompliance compliance = complianceRepository
                .findByDoctor_DoctorIdAndComplianceMonth(doctorId, month)
                .orElseGet(() -> createNewCompliance(doctor, month));

        compliance.setStatus(ComplianceStatus.EXEMPTED);
        compliance.setScheduleActive(true);
        compliance.setExemptedBy(adminUserId);
        compliance.setExemptedAt(LocalDateTime.now());
        compliance.setExemptReason(request.getReason());

        DoctorScheduleCompliance saved = complianceRepository.save(compliance);

        log.info("Admin {} exempted doctor {} from compliance for {}: {}",
                adminUserId, doctorId, month, request.getReason());

        // Notify doctor
        if (doctor.getUser() != null) {
            notificationService.sendWebSocketNotification(
                    doctor.getUser(),
                    NotificationType.SCHEDULE_COMPLIANCE_ACHIEVED,
                    "Compliance Exemption Granted",
                    String.format("You have been exempted from the schedule compliance requirement for %s. Reason: %s",
                            month, request.getReason()),
                    null,
                    "/schedule"
            );
        }

        return mapToComplianceResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ComplianceConfigResponse> getAllConfigs(Boolean active) {
        List<ScheduleComplianceConfig> configs = active != null
                ? configRepository.findWithFilters(active)
                : configRepository.findAll();

        return configs.stream()
                .map(this::mapToConfigResponse)
                .collect(Collectors.toList());
    }

    @Override
    public ComplianceConfigResponse createConfig(ComplianceConfigRequest request) {
        // Check if config already exists for specialty
        if (request.getSpecialtyId() != null) {
            if (configRepository.existsBySpecialty_SpecialtyIdAndActiveTrue(request.getSpecialtyId())) {
                throw new BadRequestException("An active config already exists for this specialty");
            }
        }

        ScheduleComplianceConfig config = ScheduleComplianceConfig.builder()
                .minHoursPerMonth(request.getMinHoursPerMonth())
                .warningThresholdPercent(request.getWarningThresholdPercent() != null
                        ? request.getWarningThresholdPercent() : 80)
                .description(request.getDescription())
                .active(request.isActive())
                .effectiveFrom(request.getEffectiveFrom())
                .effectiveTo(request.getEffectiveTo())
                .build();

        if (request.getSpecialtyId() != null) {
            Specialty specialty = new Specialty();
            specialty.setSpecialtyId(request.getSpecialtyId());
            config.setSpecialty(specialty);
        }

        ScheduleComplianceConfig saved = configRepository.save(config);
        log.info("Created compliance config: {} hours/month for {}",
                request.getMinHoursPerMonth(),
                request.getSpecialtyId() != null ? "specialty " + request.getSpecialtyId() : "global");

        return mapToConfigResponse(saved);
    }

    @Override
    public ComplianceConfigResponse updateConfig(Integer configId, ComplianceConfigRequest request) {
        ScheduleComplianceConfig config = configRepository.findById(configId)
                .orElseThrow(() -> new ResourceNotFoundException("ComplianceConfig", "id", configId.toString()));

        config.setMinHoursPerMonth(request.getMinHoursPerMonth());
        if (request.getWarningThresholdPercent() != null) {
            config.setWarningThresholdPercent(request.getWarningThresholdPercent());
        }
        config.setDescription(request.getDescription());
        config.setActive(request.isActive());
        config.setEffectiveFrom(request.getEffectiveFrom());
        config.setEffectiveTo(request.getEffectiveTo());

        ScheduleComplianceConfig saved = configRepository.save(config);
        log.info("Updated compliance config {}", configId);

        return mapToConfigResponse(saved);
    }

    @Override
    public void deleteConfig(Integer configId) {
        if (!configRepository.existsById(configId)) {
            throw new ResourceNotFoundException("ComplianceConfig", "id", configId.toString());
        }
        configRepository.deleteById(configId);
        log.info("Deleted compliance config {}", configId);
    }

    // ========== Internal/Scheduler Methods ==========

    @Override
    public BigDecimal calculateScheduledHours(String doctorId, String month) {
        validateMonthFormat(month);
        YearMonth yearMonth = YearMonth.parse(month);
        LocalDate startDate = yearMonth.atDay(1);
        LocalDate endDate = yearMonth.atEndOfMonth();

        // Get all schedules for the doctor
        List<DoctorSchedule> schedules = scheduleRepository.findByDoctor_DoctorId(doctorId);
        if (schedules.isEmpty()) {
            return BigDecimal.ZERO;
        }

        // Get all exceptions for the month
        List<DoctorScheduleException> exceptions = exceptionRepository
                .findByDoctor_DoctorIdAndExceptionDateBetween(doctorId, startDate, endDate);

        // Create a map of exceptions by date
        Map<LocalDate, DoctorScheduleException> exceptionMap = exceptions.stream()
                .collect(Collectors.toMap(
                        DoctorScheduleException::getExceptionDate,
                        e -> e,
                        (e1, e2) -> e1
                ));

        BigDecimal totalHours = BigDecimal.ZERO;

        // Iterate through each day of the month
        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            int dayOfWeek = date.getDayOfWeek().getValue() % 7; // 0 = Sunday

            // Check for exception on this date
            DoctorScheduleException exception = exceptionMap.get(date);

            if (exception != null) {
                if ("DayOff".equals(exception.getExceptionType())) {
                    // Day off - no hours
                    continue;
                } else if ("Modified".equals(exception.getExceptionType())) {
                    // Modified schedule - use exception times
                    if (exception.getStartTime() != null && exception.getEndTime() != null) {
                        long minutes = ChronoUnit.MINUTES.between(
                                exception.getStartTime(), exception.getEndTime());
                        totalHours = totalHours.add(
                                BigDecimal.valueOf(minutes).divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP));
                    }
                    continue;
                }
                // AddSlot - will be added below along with regular schedule
            }

            // Regular schedule for this day of week
            for (DoctorSchedule schedule : schedules) {
                if (schedule.getDayOfWeek() == dayOfWeek && schedule.isAvailable()) {
                    long minutes = ChronoUnit.MINUTES.between(
                            schedule.getStartTime(), schedule.getEndTime());
                    totalHours = totalHours.add(
                            BigDecimal.valueOf(minutes).divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP));
                }
            }

            // Add extra hours from AddSlot exception
            if (exception != null && "AddSlot".equals(exception.getExceptionType())) {
                if (exception.getStartTime() != null && exception.getEndTime() != null) {
                    long minutes = ChronoUnit.MINUTES.between(
                            exception.getStartTime(), exception.getEndTime());
                    totalHours = totalHours.add(
                            BigDecimal.valueOf(minutes).divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP));
                }
            }
        }

        return totalHours.setScale(2, RoundingMode.HALF_UP);
    }

    @Override
    public DoctorScheduleCompliance updateComplianceAfterScheduleChange(String doctorId) {
        Doctor doctor = findDoctor(doctorId);
        String currentMonth = LocalDate.now().format(MONTH_FORMATTER);

        int requiredHours = getRequiredHoursForDoctor(doctor, currentMonth);
        BigDecimal scheduledHours = calculateScheduledHours(doctorId, currentMonth);

        DoctorScheduleCompliance compliance = getOrCreateCompliance(doctor, currentMonth, requiredHours);
        compliance.setScheduledHours(scheduledHours);

        double percentage = requiredHours > 0
                ? scheduledHours.doubleValue() / requiredHours * 100
                : 100.0;
        boolean isCompliant = percentage >= 100.0;

        // Update status
        if (compliance.getStatus() != ComplianceStatus.EXEMPTED) {
            if (isCompliant) {
                if (compliance.getStatus() != ComplianceStatus.COMPLIANT) {
                    compliance.setStatus(ComplianceStatus.COMPLIANT);
                    // Send achievement notification
                    if (doctor.getUser() != null) {
                        notificationService.sendWebSocketNotification(
                                doctor.getUser(),
                                NotificationType.SCHEDULE_COMPLIANCE_ACHIEVED,
                                "Schedule Compliance Achieved",
                                String.format("Congratulations! You have scheduled %.1f hours for %s, meeting the %d-hour requirement.",
                                        scheduledHours.doubleValue(), currentMonth, requiredHours),
                                null,
                                "/schedule"
                        );
                    }
                }
            } else if (scheduledHours.compareTo(BigDecimal.ZERO) == 0) {
                compliance.setStatus(ComplianceStatus.PENDING);
            } else {
                compliance.setStatus(ComplianceStatus.IN_PROGRESS);
            }
            compliance.setScheduleActive(isCompliant);
        }

        DoctorScheduleCompliance saved = complianceRepository.save(compliance);
        log.info("Updated compliance for doctor {}: {}h/{} h ({}%)",
                doctorId, scheduledHours, requiredHours, Math.round(percentage));

        return saved;
    }

    @Override
    public void checkDailyCompliance() {
        String currentMonth = LocalDate.now().format(MONTH_FORMATTER);
        log.info("Running daily compliance check for {}", currentMonth);

        List<DoctorScheduleCompliance> needingCheck = complianceRepository.findNeedingDailyCheck(currentMonth);

        for (DoctorScheduleCompliance compliance : needingCheck) {
            try {
                updateComplianceAfterScheduleChange(compliance.getDoctor().getDoctorId());
            } catch (Exception e) {
                log.error("Error checking compliance for doctor {}: {}",
                        compliance.getDoctor().getDoctorId(), e.getMessage());
            }
        }

        log.info("Daily compliance check completed. Checked {} doctors", needingCheck.size());
    }

    @Override
    public void sendMonthEndWarnings() {
        String nextMonth = LocalDate.now().plusMonths(1).format(MONTH_FORMATTER);
        log.info("Sending month-end warnings for {}", nextMonth);

        // Initialize compliance records for all active doctors
        List<Doctor> doctors = doctorRepository.findByUser_Status("Active");

        int warningsSent = 0;
        for (Doctor doctor : doctors) {
            try {
                int requiredHours = getRequiredHoursForDoctor(doctor, nextMonth);
                BigDecimal scheduledHours = calculateScheduledHours(doctor.getDoctorId(), nextMonth);

                double percentage = requiredHours > 0
                        ? scheduledHours.doubleValue() / requiredHours * 100
                        : 100.0;

                if (percentage < 100 && doctor.getUser() != null) {
                    notificationService.sendWebSocketNotification(
                            doctor.getUser(),
                            NotificationType.SCHEDULE_COMPLIANCE_WARNING,
                            "Schedule Reminder for " + nextMonth,
                            String.format("You have scheduled %.1f hours for %s. Please ensure you schedule at least %d hours.",
                                    scheduledHours.doubleValue(), nextMonth, requiredHours),
                            null,
                            "/schedule"
                    );
                    warningsSent++;
                }
            } catch (Exception e) {
                log.error("Error sending warning to doctor {}: {}",
                        doctor.getDoctorId(), e.getMessage());
            }
        }

        log.info("Sent {} month-end warnings", warningsSent);
    }

    @Override
    public void markNonCompliantDoctors() {
        // Mark previous month as non-compliant for doctors who didn't meet requirements
        String previousMonth = LocalDate.now().minusMonths(1).format(MONTH_FORMATTER);
        log.info("Marking non-compliant doctors for {}", previousMonth);

        List<DoctorScheduleCompliance> pendingOrInProgress = complianceRepository.findPendingOrInProgress(previousMonth);

        int markedCount = 0;
        for (DoctorScheduleCompliance compliance : pendingOrInProgress) {
            compliance.setStatus(ComplianceStatus.NON_COMPLIANT);
            compliance.setScheduleActive(false);
            complianceRepository.save(compliance);
            markedCount++;

            log.info("Marked doctor {} as non-compliant for {}",
                    compliance.getDoctor().getDoctorId(), previousMonth);
        }

        log.info("Marked {} doctors as non-compliant for {}", markedCount, previousMonth);
    }

    @Override
    public void notifyAdminNonCompliant() {
        String previousMonth = LocalDate.now().minusMonths(1).format(MONTH_FORMATTER);
        log.info("Notifying admin about non-compliant doctors for {}", previousMonth);

        List<DoctorScheduleCompliance> nonCompliant = complianceRepository.findNonCompliantNotNotified(previousMonth);

        if (nonCompliant.isEmpty()) {
            log.info("No non-compliant doctors to notify admin about");
            return;
        }

        // Build notification message
        StringBuilder message = new StringBuilder();
        message.append(String.format("%d doctor(s) did not meet schedule requirements for %s:\n",
                nonCompliant.size(), previousMonth));

        for (DoctorScheduleCompliance compliance : nonCompliant) {
            Doctor doctor = compliance.getDoctor();
            message.append(String.format("- Dr. %s (%s): %.1f/%d hours\n",
                    doctor.getFullName(),
                    doctor.getSpecialty(),
                    compliance.getScheduledHours().doubleValue(),
                    compliance.getRequiredHours()));

            // Mark as admin notified
            compliance.setAdminNotified(true);
            complianceRepository.save(compliance);
        }

        // Notify all admins
        adminNotificationService.notifyAllAdmins(
                NotificationType.DOCTOR_SCHEDULE_NON_COMPLIANT,
                "Schedule Compliance Report - " + previousMonth,
                message.toString(),
                NotificationPriority.HIGH,
                null,
                "/admin/compliance?month=" + previousMonth
        );

        log.info("Notified admin about {} non-compliant doctors", nonCompliant.size());
    }

    // ========== Helper Methods ==========

    private Doctor findDoctor(String doctorId) {
        return doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor", "id", doctorId));
    }

    private void validateMonthFormat(String month) {
        if (month == null || !month.matches("\\d{4}-\\d{2}")) {
            throw new BadRequestException("Invalid month format. Use YYYY-MM");
        }
    }

    private int getRequiredHoursForDoctor(Doctor doctor, String month) {
        LocalDate monthDate = YearMonth.parse(month).atDay(1);
        Integer specialtyId = doctor.getSpecialtyEntity() != null
                ? doctor.getSpecialtyEntity().getSpecialtyId()
                : null;

        // Try specialty-specific config first
        if (specialtyId != null) {
            Optional<ScheduleComplianceConfig> specialtyConfig =
                    configRepository.findActiveConfigBySpecialty(specialtyId, monthDate);
            if (specialtyConfig.isPresent()) {
                return specialtyConfig.get().getMinHoursPerMonth();
            }
        }

        // Fallback to global config
        return configRepository.findActiveGlobalConfig(monthDate)
                .map(ScheduleComplianceConfig::getMinHoursPerMonth)
                .orElse(40); // Default 40 hours if no config
    }

    private DoctorScheduleCompliance getOrCreateCompliance(Doctor doctor, String month, int requiredHours) {
        return complianceRepository.findByDoctor_DoctorIdAndComplianceMonth(doctor.getDoctorId(), month)
                .orElseGet(() -> createNewCompliance(doctor, month, requiredHours));
    }

    private DoctorScheduleCompliance createNewCompliance(Doctor doctor, String month) {
        int requiredHours = getRequiredHoursForDoctor(doctor, month);
        return createNewCompliance(doctor, month, requiredHours);
    }

    private DoctorScheduleCompliance createNewCompliance(Doctor doctor, String month, int requiredHours) {
        return DoctorScheduleCompliance.builder()
                .doctor(doctor)
                .complianceMonth(month)
                .requiredHours(requiredHours)
                .scheduledHours(BigDecimal.ZERO)
                .status(ComplianceStatus.PENDING)
                .scheduleActive(false)
                .adminNotified(false)
                .build();
    }

    private ComplianceStatusResponse buildComplianceStatus(Doctor doctor, String month) {
        int requiredHours = getRequiredHoursForDoctor(doctor, month);
        BigDecimal scheduledHours = calculateScheduledHours(doctor.getDoctorId(), month);

        double percentage = requiredHours > 0
                ? scheduledHours.doubleValue() / requiredHours * 100
                : 100.0;

        // Get or create compliance record
        Optional<DoctorScheduleCompliance> existingCompliance =
                complianceRepository.findByDoctor_DoctorIdAndComplianceMonth(doctor.getDoctorId(), month);

        ComplianceStatus status;
        boolean scheduleActive;

        if (existingCompliance.isPresent()) {
            status = existingCompliance.get().getStatus();
            scheduleActive = existingCompliance.get().isScheduleActive();
        } else {
            if (percentage >= 100) {
                status = ComplianceStatus.COMPLIANT;
                scheduleActive = true;
            } else if (scheduledHours.compareTo(BigDecimal.ZERO) == 0) {
                status = ComplianceStatus.PENDING;
                scheduleActive = false;
            } else {
                status = ComplianceStatus.IN_PROGRESS;
                scheduleActive = false;
            }
        }

        String statusMessage = switch (status) {
            case COMPLIANT -> "Schedule requirements met";
            case IN_PROGRESS -> String.format("%.1f more hours needed", requiredHours - scheduledHours.doubleValue());
            case PENDING -> "No schedule set up yet";
            case NON_COMPLIANT -> "Did not meet requirements";
            case EXEMPTED -> "Exempted from requirements";
        };

        return ComplianceStatusResponse.builder()
                .doctorId(doctor.getDoctorId())
                .complianceMonth(month)
                .requiredHours(requiredHours)
                .scheduledHours(scheduledHours)
                .compliancePercentage(Math.min(percentage, 100.0))
                .status(status)
                .scheduleActive(scheduleActive)
                .statusMessage(statusMessage)
                .lastUpdated(existingCompliance.map(DoctorScheduleCompliance::getUpdatedAt).orElse(null))
                .build();
    }

    private void sendComplianceWarningNotification(Doctor doctor, String month,
                                                    BigDecimal scheduledHours, int requiredHours) {
        // Check if we already sent a notification recently (within 24 hours)
        Optional<DoctorScheduleCompliance> compliance =
                complianceRepository.findByDoctor_DoctorIdAndComplianceMonth(doctor.getDoctorId(), month);

        if (compliance.isPresent()) {
            LocalDateTime lastSent = compliance.get().getLastNotificationSent();
            if (lastSent != null && lastSent.isAfter(LocalDateTime.now().minusHours(24))) {
                return; // Don't spam notifications
            }
        }

        notificationService.sendWebSocketNotification(
                doctor.getUser(),
                NotificationType.SCHEDULE_COMPLIANCE_WARNING,
                "Schedule Compliance Warning",
                String.format("Your current schedule for %s has %.1f hours, but %d hours are required. Please update your schedule.",
                        month, scheduledHours.doubleValue(), requiredHours),
                null,
                "/schedule"
        );

        // Update last notification sent
        if (compliance.isPresent()) {
            compliance.get().setLastNotificationSent(LocalDateTime.now());
            complianceRepository.save(compliance.get());
        }
    }

    private DoctorComplianceResponse mapToComplianceResponse(DoctorScheduleCompliance compliance) {
        Doctor doctor = compliance.getDoctor();
        double percentage = compliance.getRequiredHours() > 0
                ? compliance.getScheduledHours().doubleValue() / compliance.getRequiredHours() * 100
                : 100.0;

        String statusDisplay = switch (compliance.getStatus()) {
            case COMPLIANT -> "Compliant";
            case IN_PROGRESS -> "In Progress";
            case PENDING -> "Pending";
            case NON_COMPLIANT -> "Non-Compliant";
            case EXEMPTED -> "Exempted";
        };

        return DoctorComplianceResponse.builder()
                .complianceId(compliance.getComplianceId())
                .doctorId(doctor.getDoctorId())
                .doctorName(doctor.getFullName())
                .specialty(doctor.getSpecialty())
                .avatarUrl(doctor.getAvatarUrl())
                .complianceMonth(compliance.getComplianceMonth())
                .requiredHours(compliance.getRequiredHours())
                .scheduledHours(compliance.getScheduledHours())
                .compliancePercentage(Math.min(percentage, 100.0))
                .status(compliance.getStatus())
                .statusDisplay(statusDisplay)
                .scheduleActive(compliance.isScheduleActive())
                .lastNotificationSent(compliance.getLastNotificationSent())
                .adminNotified(compliance.isAdminNotified())
                .notes(compliance.getNotes())
                .isExempted(compliance.getStatus() == ComplianceStatus.EXEMPTED)
                .exemptedBy(compliance.getExemptedBy())
                .exemptedAt(compliance.getExemptedAt())
                .exemptReason(compliance.getExemptReason())
                .createdAt(compliance.getCreatedAt())
                .updatedAt(compliance.getUpdatedAt())
                .build();
    }

    private ComplianceConfigResponse mapToConfigResponse(ScheduleComplianceConfig config) {
        return ComplianceConfigResponse.builder()
                .configId(config.getConfigId())
                .specialtyId(config.getSpecialty() != null ? config.getSpecialty().getSpecialtyId() : null)
                .specialtyName(config.getSpecialty() != null ? config.getSpecialty().getName() : null)
                .minHoursPerMonth(config.getMinHoursPerMonth())
                .warningThresholdPercent(config.getWarningThresholdPercent())
                .description(config.getDescription())
                .active(config.isActive())
                .effectiveFrom(config.getEffectiveFrom())
                .effectiveTo(config.getEffectiveTo())
                .createdAt(config.getCreatedAt())
                .updatedAt(config.getUpdatedAt())
                .isGlobal(config.getSpecialty() == null)
                .build();
    }
}
