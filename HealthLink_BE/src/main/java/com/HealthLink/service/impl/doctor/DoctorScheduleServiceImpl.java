package com.HealthLink.service.impl.doctor;

import com.HealthLink.dto.doctor.schedule.CalendarDayResponse;
import com.HealthLink.dto.doctor.schedule.DoctorScheduleRequest;
import com.HealthLink.dto.doctor.schedule.WeeklyScheduleResponse;
import com.HealthLink.dto.response.DoctorScheduleResponse;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.AppointmentSlotHold;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.DoctorSchedule;
import com.HealthLink.entity.DoctorScheduleException;
import com.HealthLink.entity.User;
import com.HealthLink.entity.enums.DoctorScheduleStatus;
import com.HealthLink.entity.enums.NotificationType;
import com.HealthLink.entity.enums.ScheduleExceptionType;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.admin.AdminScheduleAuditLogRepository;
import com.HealthLink.repository.admin.DoctorScheduleExceptionRepository;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.repository.appointment.AppointmentSlotHoldRepository;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.repository.doctor.DoctorScheduleRepository;
import com.HealthLink.service.compliance.ScheduleComplianceService;
import com.HealthLink.service.doctor.DoctorScheduleService;
import com.HealthLink.audit.AuditLogger;
import com.HealthLink.service.notification.NotificationService;
import com.HealthLink.utility.DoctorServiceHelper;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Lazy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class DoctorScheduleServiceImpl implements DoctorScheduleService {

    private final DoctorScheduleRepository scheduleRepository;
    private final DoctorScheduleExceptionRepository exceptionRepository;
    private final DoctorRepository doctorRepository;
    private final AppointmentRepository appointmentRepository;
    private final AppointmentSlotHoldRepository appointmentSlotHoldRepository;
    private final NotificationService notificationService;
    private final AdminScheduleAuditLogRepository auditLogRepository;
    private final @Lazy ScheduleComplianceService complianceService;
    private final AuditLogger audit = AuditLogger.doctor();

    private static final String[] DAY_NAMES = {"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"};

    // Minimum required working hours per MONTH for APPROVED status
    private static final double MIN_MONTHLY_HOURS = 80.0;

    @Override
    public WeeklyScheduleResponse getMySchedule(String doctorId) {
        Doctor doctor = findDoctor(doctorId);

        List<DoctorSchedule> schedules = scheduleRepository.findByDoctor_DoctorId(doctorId);
        List<DoctorScheduleException> exceptions = exceptionRepository.findByDoctor_DoctorId(doctorId);

        double monthlyHours = calculateMonthlyHours(doctorId);

        return WeeklyScheduleResponse.builder()
                .doctorId(doctorId)
                .doctorName(doctor.getFullName())
                .doctorScheduleStatus(doctor.getScheduleStatus())
                .totalMonthlyHours(monthlyHours)
                .requiredMonthlyHours(MIN_MONTHLY_HOURS)
                .schedules(schedules.stream().map(this::mapScheduleToItem).collect(Collectors.toList()))
                .exceptions(exceptions.stream().map(this::mapExceptionToItem).collect(Collectors.toList()))
                .build();
    }

    @Override
    public DoctorScheduleResponse createSchedule(String doctorId, DoctorScheduleRequest request) {
        Doctor doctor = findDoctor(doctorId);
        validateScheduleRequest(request);

        DoctorSchedule schedule = DoctorSchedule.builder()
                .doctor(doctor)
                .dayOfWeek(request.getDayOfWeek())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .slotDuration(request.getSlotDuration() != null ? request.getSlotDuration() : 30)
                .maxPatients(request.getMaxPatients() != null ? request.getMaxPatients() : 1)
                .consultationType(request.getConsultationType())
                .location(request.getLocation())
                .notes(request.getNotes())
                .available(true)
                // Individual schedule is always APPROVED; Doctor.scheduleStatus controls visibility
                .scheduleStatus(DoctorScheduleStatus.APPROVED)
                .build();

        DoctorSchedule saved = scheduleRepository.save(schedule);
        log.info("Doctor {} created schedule for day {} from {} to {}",
                doctorId, DAY_NAMES[request.getDayOfWeek()], request.getStartTime(), request.getEndTime());

        audit.log("SCHEDULE_CREATED", String.valueOf(saved.getScheduleId()), doctorId,
                java.util.Map.of("dayOfWeek", request.getDayOfWeek(),
                        "startTime", String.valueOf(request.getStartTime()),
                        "endTime", String.valueOf(request.getEndTime())));

        // Update compliance after schedule change
        updateComplianceAsync(doctorId);

        // Update Doctor.scheduleStatus based on total weekly hours
        updateDoctorScheduleStatus(doctorId);

        return mapToScheduleResponse(saved);
    }

    @Override
    public void deleteSchedule(String doctorId, Integer scheduleId) {
        DoctorSchedule schedule = findScheduleAndVerifyOwnership(doctorId, scheduleId);

        LocalDateTime now = LocalDateTime.now();
        boolean hasFutureBookings = appointmentRepository
                .findByDoctor_DoctorIdAndStatusNotAndAppointmentTimeAfter(doctorId, "CANCELLED", now)
                .stream()
                .anyMatch(a -> DoctorServiceHelper.dayOfWeekIndex(a.getAppointmentTime().getDayOfWeek()) == schedule.getDayOfWeek()
                        && !a.getAppointmentTime().toLocalTime().isBefore(schedule.getStartTime())
                        && a.getAppointmentTime().toLocalTime().isBefore(schedule.getEndTime()));

        if (hasFutureBookings) {
            throw new BadRequestException("Cannot delete a schedule that contains future booked appointments. Please reschedule those appointments first.");
        }

        scheduleRepository.delete(schedule);
        log.info("Doctor {} deleted schedule {}", doctorId, scheduleId);

        audit.log("SCHEDULE_DELETED", String.valueOf(scheduleId), doctorId);
        logAdminScheduleDeletion(schedule);

        // Update compliance after schedule change
        updateComplianceAsync(doctorId);

        // Update Doctor.scheduleStatus based on total weekly hours
        updateDoctorScheduleStatus(doctorId);
    }

    private void logAdminScheduleDeletion(DoctorSchedule schedule) {
        if (schedule.getDoctor() != null && schedule.getDoctor().getUser() != null) {
            auditLogRepository.save(
                    com.HealthLink.entity.AdminScheduleAuditLog.builder()
                            .adminUser(schedule.getDoctor().getUser())
                            .actionType("DELETE_SCHEDULE")
                            .targetDoctorId(schedule.getDoctor().getDoctorId())
                            .targetAppointmentId(null)
                            .targetPatientId(null)
                            .description("Doctor deleted schedule " + schedule.getScheduleId() + " for day " + DAY_NAMES[schedule.getDayOfWeek()])
                            .oldValue("{\"scheduleId\":" + schedule.getScheduleId() + ",\"dayOfWeek\":" + schedule.getDayOfWeek() + ",\"startTime\":\"" + schedule.getStartTime() + "\",\"endTime\":\"" + schedule.getEndTime() + "\"}")
                            .newValue(null)
                            .reason("Doctor deleted schedule")
                            .ipAddress(null)
                            .createdAt(LocalDateTime.now())
                            .build()
            );
        }
    }
    @Override
    public List<WeeklyScheduleResponse.ExceptionItem> getMyExceptions(String doctorId, LocalDate startDate, LocalDate endDate) {
        findDoctor(doctorId); // Verify doctor exists

        List<DoctorScheduleException> exceptions = exceptionRepository
                .findByDoctor_DoctorIdAndExceptionDateBetween(doctorId, startDate, endDate);

        return exceptions.stream()
                .map(this::mapExceptionToItem)
                .collect(Collectors.toList());
    }

    @Override
    public void deleteException(String doctorId, Integer exceptionId) {
        DoctorScheduleException exception = exceptionRepository.findById(exceptionId)
                .orElseThrow(() -> new ResourceNotFoundException("Schedule Exception", "id", exceptionId.toString()));

        // Verify ownership
        if (!exception.getDoctor().getDoctorId().equals(doctorId)) {
            throw new BadRequestException("You don't have permission to delete this exception");
        }

        // Cannot delete admin-created exceptions
        if (exception.getReason() != null && exception.getReason().startsWith("[Admin]")) {
            throw new BadRequestException("Cannot delete admin-created exceptions. Contact admin for changes.");
        }

        exceptionRepository.delete(exception);
        log.info("Doctor {} deleted exception {}", doctorId, exceptionId);
    }

    @Override
    public List<CalendarDayResponse> getCalendarView(String doctorId, LocalDate startDate, LocalDate endDate) {
        Doctor doctor = findDoctor(doctorId);

        List<DoctorSchedule> schedules = scheduleRepository.findByDoctor_DoctorId(doctorId);
        List<DoctorScheduleException> exceptions = exceptionRepository
                .findByDoctor_DoctorIdAndExceptionDateBetween(doctorId, startDate, endDate);

        LocalDateTime now = LocalDateTime.now();
        List<CalendarDayResponse> result = new ArrayList<>();

        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            CalendarDayResponse dayResponse = buildCalendarDay(doctor, date, schedules, exceptions, now);
            result.add(dayResponse);
        }

        return result;
    }

    // ========== Private Helper Methods ==========

    private Doctor findDoctor(String doctorId) {
        return doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor", "id", doctorId));
    }

    private DoctorSchedule findScheduleAndVerifyOwnership(String doctorId, Integer scheduleId) {
        DoctorSchedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new ResourceNotFoundException("Schedule", "id", scheduleId.toString()));

        if (!schedule.getDoctor().getDoctorId().equals(doctorId)) {
            throw new BadRequestException("You don't have permission to modify this schedule");
        }

        return schedule;
    }

    private void validateScheduleRequest(DoctorScheduleRequest request) {
        if (request.getStartTime().isAfter(request.getEndTime())) {
            throw new BadRequestException("Start time must be before end time");
        }
        if (request.getSlotDuration() != null && (request.getSlotDuration() < 10 || request.getSlotDuration() > 120)) {
            throw new BadRequestException("Slot duration must be between 10 and 120 minutes");
        }
    }


    private void notifyAffectedPatients(Doctor doctor, LocalDate date, String reason) {
        LocalDateTime dayStart = date.atStartOfDay();
        LocalDateTime dayEnd = date.plusDays(1).atStartOfDay().minusSeconds(1);

        List<Appointment> affectedAppointments = appointmentRepository
                .findByDoctor_DoctorIdAndStatusNotAndAppointmentTimeBetween(
                        doctor.getDoctorId(), "CANCELLED", dayStart, dayEnd);

        for (Appointment appointment : affectedAppointments) {
            User patientUser = appointment.getPatient().getUser();
            if (patientUser != null) {
                String title = "Doctor Schedule Changed";
                String body = String.format("Dr. %s has blocked %s. Your appointment may be affected. Reason: %s",
                        doctor.getFullName(), date, reason);

                try {
                    notificationService.sendMobilePushNotification(
                            patientUser,
                            NotificationType.ADMIN_SCHEDULE_CHANGE, // Reuse existing type
                            title,
                            body,
                            com.HealthLink.entity.enums.NotificationPriority.HIGH,
                            appointment.getAppointmentId(),
                            "/appointments/" + appointment.getAppointmentId()
                    );
                    log.info("Notified patient {} about schedule change on {}", patientUser.getId(), date);
                } catch (Exception e) {
                    log.error("Failed to notify patient {} about schedule change", patientUser.getId(), e);
                }
            }
        }
    }

    private CalendarDayResponse buildCalendarDay(
            Doctor doctor,
            LocalDate date,
            List<DoctorSchedule> schedules,
            List<DoctorScheduleException> exceptions,
            LocalDateTime now
    ) {
        int dayOfWeek = DoctorServiceHelper.dayOfWeekIndex(date.getDayOfWeek());
        String dayName = date.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.ENGLISH);

        // Check for exception on this date
        DoctorScheduleException exception = exceptions.stream()
                .filter(e -> e.getExceptionDate().equals(date))
                .findFirst()
                .orElse(null);

        String status;
        List<CalendarDayResponse.SlotInfo> slots = new ArrayList<>();

        if (exception != null && exception.getExceptionType() == ScheduleExceptionType.DAY_OFF) {
            status = "DAY_OFF";
        } else if (exception != null && exception.getExceptionType() == ScheduleExceptionType.MODIFIED) {
            status = "MODIFIED";
            slots = generateSlots(doctor.getDoctorId(), date, exception.getStartTime(), exception.getEndTime(), 30, now);
        } else {
            // Normal schedules
            List<DoctorSchedule> daySchedules = schedules.stream()
                    .filter(s -> s.getDayOfWeek() == dayOfWeek && s.isAvailable() && s.getScheduleStatus() == DoctorScheduleStatus.APPROVED)
                    .collect(Collectors.toList());

            if (daySchedules.isEmpty()) {
                status = "NO_SCHEDULE";
            } else {
                status = "WORKING";
                for (DoctorSchedule schedule : daySchedules) {
                    int slotDuration = schedule.getSlotDuration() != null ? schedule.getSlotDuration() : 30;
                    slots.addAll(generateSlots(doctor.getDoctorId(), date, schedule.getStartTime(), schedule.getEndTime(), slotDuration, now));
                }
            }

            // AddSlot exception adds extra slots
            if (exception != null && exception.getExceptionType() == ScheduleExceptionType.ADD_SLOT) {
                slots.addAll(generateSlots(doctor.getDoctorId(), date, exception.getStartTime(), exception.getEndTime(), 30, now));
                if ("NO_SCHEDULE".equals(status)) {
                    status = "WORKING";
                }
            }
        }

        // Sort slots by start time
        slots.sort((a, b) -> a.getStartTime().compareTo(b.getStartTime()));

        return CalendarDayResponse.builder()
                .date(date)
                .dayName(dayName)
                .status(status)
                .slots(slots)
                .build();
    }

    private List<CalendarDayResponse.SlotInfo> generateSlots(
            String doctorId,
            LocalDate date,
            LocalTime startTime,
            LocalTime endTime,
            int slotDuration,
            LocalDateTime now
    ) {
        List<CalendarDayResponse.SlotInfo> slots = new ArrayList<>();

        LocalDateTime dayStart = date.atStartOfDay();
        LocalDateTime dayEnd = date.plusDays(1).atStartOfDay().minusSeconds(1);

        // Get booked appointments for this day
        List<Appointment> bookedAppointments = appointmentRepository
                .findByDoctor_DoctorIdAndStatusNotAndAppointmentTimeBetween(
                        doctorId, "CANCELLED", dayStart, dayEnd);

        // Get active holds
        List<AppointmentSlotHold> activeHolds = appointmentSlotHoldRepository
                .findByDoctor_DoctorIdAndAppointmentTimeBetweenAndExpiresAtAfter(
                        doctorId, dayStart, dayEnd, now);

        LocalDateTime slotStart = LocalDateTime.of(date, startTime);
        LocalDateTime scheduleEnd = LocalDateTime.of(date, endTime);

        while (!slotStart.plusMinutes(slotDuration).isAfter(scheduleEnd)) {
            LocalDateTime currentSlotStart = slotStart;
            LocalDateTime currentSlotEnd = slotStart.plusMinutes(slotDuration);

            // Find matching appointment
            Appointment bookedAppointment = bookedAppointments.stream()
                    .filter(a -> a.getAppointmentTime().equals(currentSlotStart))
                    .findFirst()
                    .orElse(null);

            boolean isHeld = activeHolds.stream()
                    .anyMatch(h -> h.getAppointmentTime().equals(currentSlotStart));

            String status;
            String patientName = null;
            Integer appointmentId = null;
            String consultationType = null;

            if (bookedAppointment != null) {
                status = "BOOKED";
                patientName = bookedAppointment.getPatient().getFullName();
                appointmentId = bookedAppointment.getAppointmentId();
                consultationType = bookedAppointment.getConsultationType();
            } else if (isHeld) {
                status = "HELD";
            } else {
                status = "AVAILABLE";
            }

            slots.add(CalendarDayResponse.SlotInfo.builder()
                    .startTime(currentSlotStart.toLocalTime())
                    .endTime(currentSlotEnd.toLocalTime())
                    .status(status)
                    .patientName(patientName)
                    .appointmentId(appointmentId)
                    .consultationType(consultationType)
                    .build());

            slotStart = currentSlotEnd;
        }

        return slots;
    }

    private WeeklyScheduleResponse.ScheduleItem mapScheduleToItem(DoctorSchedule schedule) {
        return WeeklyScheduleResponse.ScheduleItem.builder()
                .scheduleId(schedule.getScheduleId())
                .dayOfWeek(schedule.getDayOfWeek())
                .dayName(DAY_NAMES[schedule.getDayOfWeek()])
                .startTime(schedule.getStartTime())
                .endTime(schedule.getEndTime())
                .slotDuration(schedule.getSlotDuration())
                .maxPatients(schedule.getMaxPatients())
                .consultationType(schedule.getConsultationType())
                .location(schedule.getLocation())
                .notes(schedule.getNotes())
                .available(schedule.isAvailable())
                .scheduleStatus(schedule.getScheduleStatus())
                .build();
    }

    private WeeklyScheduleResponse.ExceptionItem mapExceptionToItem(DoctorScheduleException exception) {
        return WeeklyScheduleResponse.ExceptionItem.builder()
                .exceptionId(exception.getExceptionId())
                .exceptionDate(exception.getExceptionDate())
                .exceptionType(exception.getExceptionType().name())
                .startTime(exception.getStartTime())
                .endTime(exception.getEndTime())
                .reason(exception.getReason())
                .recurring(exception.isRecurring())
                .recurringUntil(exception.getRecurringUntil())
                .isAdminCreated(exception.getReason() != null && exception.getReason().startsWith("[Admin]"))
                .build();
    }

    private DoctorScheduleResponse mapToScheduleResponse(DoctorSchedule schedule) {
        return DoctorScheduleResponse.builder()
                .scheduleId(schedule.getScheduleId())
                .dayOfWeek(schedule.getDayOfWeek())
                .dayName(DAY_NAMES[schedule.getDayOfWeek()])
                .startTime(schedule.getStartTime())
                .endTime(schedule.getEndTime())
                .slotDuration(schedule.getSlotDuration())
                .consultationType(schedule.getConsultationType())
                .available(schedule.isAvailable())
                .scheduleStatus(schedule.getScheduleStatus())
                .build();
    }

    /**
     * Update compliance status asynchronously after schedule changes.
     * Wrapped in try-catch to prevent compliance errors from affecting schedule operations.
     */
    private void updateComplianceAsync(String doctorId) {
        try {
            complianceService.updateComplianceAfterScheduleChange(doctorId);
        } catch (Exception e) {
            log.error("Error updating compliance for doctor {}: {}", doctorId, e.getMessage());
            // Don't throw - compliance update failure shouldn't affect schedule operations
        }
    }

    /**
     * Calculate total working hours for the current month by iterating through each day.
     * This accounts for:
     * - Regular schedules for each day of week
     * - Exceptions (DayOff, Modified, AddSlot)
     *
     * @param doctorId the doctor ID
     * @return total hours for the current month
     */
    private double calculateMonthlyHours(String doctorId) {
        YearMonth currentMonth = YearMonth.now();
        LocalDate startDate = currentMonth.atDay(1);
        LocalDate endDate = currentMonth.atEndOfMonth();

        // Get all schedules for the doctor
        List<DoctorSchedule> schedules = scheduleRepository.findByDoctor_DoctorId(doctorId);
        if (schedules.isEmpty()) {
            return 0.0;
        }

        // Get all exceptions for the current month
        List<DoctorScheduleException> exceptions = exceptionRepository
                .findByDoctor_DoctorIdAndExceptionDateBetween(doctorId, startDate, endDate);

        // Create a map of exceptions by date for quick lookup
        Map<LocalDate, DoctorScheduleException> exceptionMap = exceptions.stream()
                .collect(Collectors.toMap(
                        DoctorScheduleException::getExceptionDate,
                        e -> e,
                        (e1, e2) -> e1 // In case of duplicates, keep the first
                ));

        double totalMinutes = 0.0;

        // Iterate through each day of the month
        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            int dayOfWeek = DoctorServiceHelper.dayOfWeekIndex(date.getDayOfWeek());

            // Check for exception on this date
            DoctorScheduleException exception = exceptionMap.get(date);

            if (exception != null) {
                if (exception.getExceptionType() == ScheduleExceptionType.DAY_OFF) {
                    // Day off - no hours for this day
                    continue;
                } else if (exception.getExceptionType() == ScheduleExceptionType.MODIFIED) {
                    // Modified schedule - use exception times instead of regular schedule
                    if (exception.getStartTime() != null && exception.getEndTime() != null) {
                        long minutes = Duration.between(exception.getStartTime(), exception.getEndTime()).toMinutes();
                        totalMinutes += Math.max(0, minutes);
                    }
                    continue;
                }
                // AddSlot - will be added below along with regular schedule
            }

            // Add hours from regular schedules for this day of week
            for (DoctorSchedule schedule : schedules) {
                if (schedule.getDayOfWeek() == dayOfWeek && schedule.isAvailable()) {
                    long minutes = Duration.between(schedule.getStartTime(), schedule.getEndTime()).toMinutes();
                    totalMinutes += Math.max(0, minutes);
                }
            }

            // Add extra hours from AddSlot exception
            if (exception != null && exception.getExceptionType() == ScheduleExceptionType.ADD_SLOT) {
                if (exception.getStartTime() != null && exception.getEndTime() != null) {
                    long minutes = Duration.between(exception.getStartTime(), exception.getEndTime()).toMinutes();
                    totalMinutes += Math.max(0, minutes);
                }
            }
        }

        return totalMinutes / 60.0;
    }

    /**
     * Update Doctor.scheduleStatus based on total monthly hours.
     * - PENDING: No schedules
     * - APPROVED: >= 80 hours/month
     * - REJECTED: < 80 hours/month but has schedules
     */
    private void updateDoctorScheduleStatus(String doctorId) {
        Doctor doctor = findDoctor(doctorId);
        List<DoctorSchedule> schedules = scheduleRepository.findByDoctor_DoctorId(doctorId);

        DoctorScheduleStatus oldStatus = doctor.getScheduleStatus();
        DoctorScheduleStatus newStatus;

        if (schedules.isEmpty() || schedules.stream().noneMatch(DoctorSchedule::isAvailable)) {
            // No schedules or all unavailable -> PENDING
            newStatus = DoctorScheduleStatus.PENDING;
        } else {
            double monthlyHours = calculateMonthlyHours(doctorId);
            if (monthlyHours >= MIN_MONTHLY_HOURS) {
                newStatus = DoctorScheduleStatus.APPROVED;
            } else {
                newStatus = DoctorScheduleStatus.REJECTED;
            }
            log.info("Doctor {} monthly hours: {}h (required: {}h) -> {}",
                    doctorId, String.format("%.1f", monthlyHours), MIN_MONTHLY_HOURS, newStatus);
        }

        if (oldStatus != newStatus) {
            doctor.setScheduleStatus(newStatus);
            doctorRepository.save(doctor);
            log.info("Doctor {} schedule status changed: {} -> {}", doctorId, oldStatus, newStatus);

            // Notify doctor about status change
            notifyDoctorScheduleStatusChange(doctor, oldStatus, newStatus);
        }
    }

    /**
     * Notify doctor when their schedule status changes.
     */
    private void notifyDoctorScheduleStatusChange(Doctor doctor, DoctorScheduleStatus oldStatus, DoctorScheduleStatus newStatus) {
        if (doctor.getUser() == null) return;

        String title;
        String message;

        switch (newStatus) {
            case APPROVED:
                title = "Schedule Approved";
                message = "Your schedule meets the minimum requirement (80 hours/month). You are now visible to patients for booking.";
                break;
            case REJECTED:
                double currentHours = calculateMonthlyHours(doctor.getDoctorId());
                title = "Schedule Not Approved";
                message = String.format("Your current schedule is %.1f hours/month. You need at least 80 hours/month to be visible to patients.", currentHours);
                break;
            case PENDING:
                title = "Schedule Pending";
                message = "Please set up your weekly schedule to be visible to patients for booking.";
                break;
            default:
                return;
        }

        try {
            notificationService.sendWebSocketNotification(
                    doctor.getUser(),
                    NotificationType.ADMIN_SCHEDULE_CHANGE,
                    title,
                    message,
                    null,
                    "/doctor/schedule"
            );
        } catch (Exception e) {
            log.error("Failed to notify doctor {} about schedule status change: {}", doctor.getDoctorId(), e.getMessage());
        }
    }
}
