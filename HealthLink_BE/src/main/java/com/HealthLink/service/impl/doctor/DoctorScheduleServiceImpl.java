package com.HealthLink.service.impl.doctor;

import com.HealthLink.dto.doctor.schedule.CalendarDayResponse;
import com.HealthLink.dto.doctor.schedule.DoctorDayOffRequest;
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

    // Allowed shift windows. Online schedules must fit within ONE of these;
    // Home visit schedules use the whole window as a single bookable session.
    private static final LocalTime MORNING_START = LocalTime.of(7, 0);
    private static final LocalTime MORNING_END = LocalTime.of(10, 30);
    private static final LocalTime AFTERNOON_START = LocalTime.of(13, 0);
    private static final LocalTime AFTERNOON_END = LocalTime.of(17, 30);
    private static final LocalTime EVENING_START = LocalTime.of(19, 0);
    private static final LocalTime EVENING_END = LocalTime.of(21, 0);

    private static final String SHIFT_MORNING = "MORNING";
    private static final String SHIFT_AFTERNOON = "AFTERNOON";
    private static final String SHIFT_EVENING = "EVENING";
    private static final String TYPE_HOME_VISIT = "HomeVisit";

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
                .needsScheduleReconfirmation(Boolean.TRUE.equals(doctor.getNeedsScheduleReconfirmation()))
                .schedules(schedules.stream().map(this::mapScheduleToItem).collect(Collectors.toList()))
                .exceptions(exceptions.stream().map(this::mapExceptionToItem).collect(Collectors.toList()))
                .build();
    }

    @Override
    public void confirmMonthlySchedule(String doctorId) {
        Doctor doctor = findDoctor(doctorId);

        if (!Boolean.TRUE.equals(doctor.getNeedsScheduleReconfirmation())) {
            throw new BadRequestException("No schedule reconfirmation is currently pending.");
        }

        double monthlyHours = calculateMonthlyHours(doctorId);
        if (monthlyHours < MIN_MONTHLY_HOURS) {
            throw new BadRequestException("Your schedule no longer meets the minimum required hours. Please add more working hours instead.");
        }

        doctor.setScheduleStatus(DoctorScheduleStatus.APPROVED);
        doctor.setNeedsScheduleReconfirmation(false);
        doctorRepository.save(doctor);

        audit.log("SCHEDULE_MONTHLY_RECONFIRMED", doctorId, doctorId,
                Map.of("monthlyHours", String.format("%.1f", monthlyHours)));
        log.info("Doctor {} confirmed monthly schedule ({}h)", doctorId, String.format("%.1f", monthlyHours));
    }

    @Override
    public void runMonthlyReconfirmationCheck() {
        YearMonth previousMonth = YearMonth.now().minusMonths(1);
        YearMonth currentMonth = YearMonth.now();
        String currentMonthLabel = currentMonth.getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH) + " " + currentMonth.getYear();

        List<Doctor> doctors = doctorRepository.findByUser_Status("Active");

        int reconfirmCount = 0;
        int reminderCount = 0;

        for (Doctor doctor : doctors) {
            try {
                List<DoctorSchedule> schedules = scheduleRepository.findByDoctor_DoctorId(doctor.getDoctorId());
                if (schedules.isEmpty() || schedules.stream().noneMatch(DoctorSchedule::isAvailable)) {
                    continue; // No schedule to carry over
                }

                double previousMonthHours = calculateHoursForMonth(doctor.getDoctorId(), previousMonth);
                double currentMonthHours = calculateHoursForMonth(doctor.getDoctorId(), currentMonth);

                boolean metQuotaLastMonth = previousMonthHours >= MIN_MONTHLY_HOURS;
                boolean carriesOverAndQualifies = currentMonthHours >= MIN_MONTHLY_HOURS;

                if (metQuotaLastMonth && carriesOverAndQualifies) {
                    // Schedule carried over and still qualifies: force reconfirmation instead of auto-approving
                    doctor.setScheduleStatus(DoctorScheduleStatus.PENDING);
                    doctor.setNeedsScheduleReconfirmation(true);
                    doctorRepository.save(doctor);
                    reconfirmCount++;

                    if (doctor.getUser() != null) {
                        notificationService.sendWebSocketNotification(
                                doctor.getUser(),
                                NotificationType.SCHEDULE_MONTHLY_RECONFIRM_REQUIRED,
                                "Please Reconfirm Your Schedule",
                                String.format("Your working schedule carries over into %s and still meets the %.0fh/month requirement. Please reconfirm to keep it active for patient bookings.",
                                        currentMonthLabel, MIN_MONTHLY_HOURS),
                                null,
                                "/doctor/schedule"
                        );
                    }
                } else if (!metQuotaLastMonth) {
                    // Didn't meet quota last month: refresh real status for the new month and remind to add hours
                    updateDoctorScheduleStatus(doctor.getDoctorId());
                    reminderCount++;

                    if (doctor.getUser() != null) {
                        notificationService.sendWebSocketNotification(
                                doctor.getUser(),
                                NotificationType.SCHEDULE_COMPLIANCE_WARNING,
                                "Add More Working Hours",
                                String.format("You did not meet the %.0fh/month requirement last month. Please add more working hours for %s so patients can book with you.",
                                        MIN_MONTHLY_HOURS, currentMonthLabel),
                                null,
                                "/doctor/schedule"
                        );
                    }
                } else {
                    // Met quota last month but schedule no longer covers the new month: just refresh status
                    updateDoctorScheduleStatus(doctor.getDoctorId());
                }
            } catch (Exception e) {
                log.error("Error running monthly reconfirmation check for doctor {}: {}",
                        doctor.getDoctorId(), e.getMessage(), e);
            }
        }

        log.info("Monthly reconfirmation check completed: {} doctor(s) need reconfirmation, {} doctor(s) reminded to add hours",
                reconfirmCount, reminderCount);
    }

    @Override
    public DoctorScheduleResponse createSchedule(String doctorId, DoctorScheduleRequest request) {
        Doctor doctor = findDoctor(doctorId);
        validateScheduleRequest(request);
        validateNoOverlap(doctorId, request);

        DoctorSchedule schedule = DoctorSchedule.builder()
                .doctor(doctor)
                .dayOfWeek(request.getDayOfWeek())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .slotDuration(request.getSlotDuration() != null ? request.getSlotDuration() : 30)
                .maxPatients(request.getMaxPatients() != null ? request.getMaxPatients() : 1)
                .consultationType(request.getConsultationType())
                .shiftType(request.getShiftType())
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
    public WeeklyScheduleResponse.ExceptionItem createDayOff(String doctorId, DoctorDayOffRequest request) {
        Doctor doctor = findDoctor(doctorId);

        LocalDate date = request.getExceptionDate();
        if (!date.isAfter(LocalDate.now())) {
            throw new BadRequestException("Day off date must be in the future");
        }

        int dayOfWeek = DoctorServiceHelper.dayOfWeekIndex(date.getDayOfWeek());
        boolean hasScheduleThatDay = !scheduleRepository
                .findByDoctor_DoctorIdAndDayOfWeekAndAvailableTrue(doctorId, dayOfWeek)
                .isEmpty();
        if (!hasScheduleThatDay) {
            throw new BadRequestException("You don't have a working schedule on this date, so a day off is not needed.");
        }

        exceptionRepository.findByDoctor_DoctorIdAndExceptionDate(doctorId, date)
                .ifPresent(existing -> {
                    throw new BadRequestException("An exception already exists for this date. Delete it first.");
                });

        DoctorScheduleException exception = DoctorScheduleException.builder()
                .doctor(doctor)
                .exceptionDate(date)
                .exceptionType(ScheduleExceptionType.DAY_OFF)
                .reason(request.getReason())
                .recurring(false)
                .build();

        DoctorScheduleException saved = exceptionRepository.save(exception);
        log.info("Doctor {} created day off on {}", doctorId, date);

        audit.log("DAY_OFF_CREATED", String.valueOf(saved.getExceptionId()), doctorId,
                java.util.Map.of("exceptionDate", String.valueOf(date)));
        logDoctorDayOffCreation(saved);

        // Day off reduces scheduled hours for the month; keep compliance and schedule status in sync
        updateComplianceAsync(doctorId);
        updateDoctorScheduleStatus(doctorId);

        return mapExceptionToItem(saved);
    }

    private void logDoctorDayOffCreation(DoctorScheduleException exception) {
        if (exception.getDoctor() != null && exception.getDoctor().getUser() != null) {
            auditLogRepository.save(
                    com.HealthLink.entity.AdminScheduleAuditLog.builder()
                            .adminUser(exception.getDoctor().getUser())
                            .actionType("CREATE_DAY_OFF")
                            .targetDoctorId(exception.getDoctor().getDoctorId())
                            .targetAppointmentId(null)
                            .targetPatientId(null)
                            .description("Doctor registered a day off on " + exception.getExceptionDate())
                            .oldValue(null)
                            .newValue("{\"exceptionId\":" + exception.getExceptionId() + ",\"exceptionDate\":\"" + exception.getExceptionDate() + "\"}")
                            .reason(exception.getReason())
                            .ipAddress(null)
                            .createdAt(LocalDateTime.now())
                            .build()
            );
        }
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

    /**
     * Validate (and for Home visit, normalize) the schedule request.
     *
     * - Home visit: lịch theo CA cố định (Sáng/Chiều/Tối). Server gán cứng giờ theo khung của ca,
     *   để mỗi ca = đúng 1 slot đặt được (slotDuration = độ dài ca) và tối đa 2 bệnh nhân/ca.
     * - Online: giờ nhập tự do nhưng phải nằm gọn trong MỘT khung cho phép
     *   (Sáng 07:00–10:30, Chiều 13:00–17:30, Tối 19:00–21:00), tối đa 1 bệnh nhân/slot.
     */
    private void validateScheduleRequest(DoctorScheduleRequest request) {
        if (isHomeVisitType(request.getConsultationType())) {
            LocalTime[] window = shiftWindow(request.getShiftType());
            if (window == null) {
                throw new BadRequestException("Home visit schedule requires a valid shift: MORNING, AFTERNOON or EVENING");
            }
            request.setShiftType(request.getShiftType().trim().toUpperCase());
            request.setConsultationType(TYPE_HOME_VISIT);
            request.setStartTime(window[0]);
            request.setEndTime(window[1]);
            request.setSlotDuration((int) Duration.between(window[0], window[1]).toMinutes());
            int homeVisitMaxPatients = request.getMaxPatients() != null ? request.getMaxPatients() : 1;
            if (homeVisitMaxPatients < 1 || homeVisitMaxPatients > 2) {
                throw new BadRequestException("Home visit max patients per slot must be between 1 and 2");
            }
            request.setMaxPatients(homeVisitMaxPatients);
            return;
        }

        // Online schedule
        request.setShiftType(null);
        LocalTime start = request.getStartTime();
        LocalTime end = request.getEndTime();
        if (!start.isBefore(end)) {
            throw new BadRequestException("Start time must be before end time");
        }
        boolean withinWindow =
                (!start.isBefore(MORNING_START) && !end.isAfter(MORNING_END))
                || (!start.isBefore(AFTERNOON_START) && !end.isAfter(AFTERNOON_END))
                || (!start.isBefore(EVENING_START) && !end.isAfter(EVENING_END));
        if (!withinWindow) {
            throw new BadRequestException(
                    "Online working hours must fit within one shift window: "
                    + "Morning 07:00-10:30, Afternoon 13:00-17:30, or Evening 19:00-21:00");
        }
        if (request.getSlotDuration() != null && (request.getSlotDuration() < 10 || request.getSlotDuration() > 120)) {
            throw new BadRequestException("Slot duration must be between 10 and 120 minutes");
        }
        int onlineMaxPatients = request.getMaxPatients() != null ? request.getMaxPatients() : 1;
        if (onlineMaxPatients != 1) {
            throw new BadRequestException("Online max patients per slot is limited to 1");
        }
        request.setMaxPatients(onlineMaxPatients);
    }

    /**
     * Chặn tạo lịch chồng giờ trong cùng một ngày. Áp dụng cho mọi loại:
     * online vs online, home visit vs online, ... (home visit đã được gán giờ theo ca
     * trước đó nên cũng so theo [startTime, endTime)).
     */
    private void validateNoOverlap(String doctorId, DoctorScheduleRequest request) {
        LocalTime newStart = request.getStartTime();
        LocalTime newEnd = request.getEndTime();

        List<DoctorSchedule> sameDay = scheduleRepository.findByDoctor_DoctorId(doctorId).stream()
                .filter(s -> request.getDayOfWeek().equals(s.getDayOfWeek()))
                .collect(Collectors.toList());

        for (DoctorSchedule existing : sameDay) {
            // Hai khoảng [s1,e1) và [s2,e2) giao nhau khi s1 < e2 && s2 < e1
            if (newStart.isBefore(existing.getEndTime()) && existing.getStartTime().isBefore(newEnd)) {
                throw new BadRequestException(String.format(
                        "This time range (%s-%s) overlaps an existing schedule (%s-%s) on %s. "
                        + "Please choose a non-overlapping time.",
                        newStart, newEnd, existing.getStartTime(), existing.getEndTime(),
                        DAY_NAMES[request.getDayOfWeek()]));
            }
        }
    }

    private boolean isHomeVisitType(String type) {
        if (type == null) {
            return false;
        }
        String t = type.trim().toLowerCase();
        return t.equals("homevisit") || t.equals("home visit") || t.equals("home-visit") || t.equals("home");
    }

    private LocalTime[] shiftWindow(String shiftType) {
        if (shiftType == null) {
            return null;
        }
        switch (shiftType.trim().toUpperCase()) {
            case SHIFT_MORNING:
                return new LocalTime[]{MORNING_START, MORNING_END};
            case SHIFT_AFTERNOON:
                return new LocalTime[]{AFTERNOON_START, AFTERNOON_END};
            case SHIFT_EVENING:
                return new LocalTime[]{EVENING_START, EVENING_END};
            default:
                return null;
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
        List<CalendarDayResponse.ScheduleBlock> scheduleBlocks = new ArrayList<>();
        boolean hasOnline = false;
        boolean hasHomeVisit = false;

        if (exception != null && exception.getExceptionType() == ScheduleExceptionType.DAY_OFF) {
            status = "DAY_OFF";
        } else if (exception != null && exception.getExceptionType() == ScheduleExceptionType.MODIFIED) {
            status = "MODIFIED";
            slots = generateSlots(doctor.getDoctorId(), date, exception.getStartTime(), exception.getEndTime(), 30, now);
            hasOnline = true; // exception overrides are plain time ranges, not home-visit shifts
            scheduleBlocks.add(CalendarDayResponse.ScheduleBlock.builder()
                    .startTime(exception.getStartTime())
                    .endTime(exception.getEndTime())
                    .consultationType("Online")
                    .build());
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
                    if (isHomeVisitType(schedule.getConsultationType())) {
                        hasHomeVisit = true;
                    } else {
                        hasOnline = true;
                    }
                    scheduleBlocks.add(CalendarDayResponse.ScheduleBlock.builder()
                            .startTime(schedule.getStartTime())
                            .endTime(schedule.getEndTime())
                            .consultationType(schedule.getConsultationType())
                            .shiftType(schedule.getShiftType())
                            .build());
                }
            }

            // AddSlot exception adds extra slots
            if (exception != null && exception.getExceptionType() == ScheduleExceptionType.ADD_SLOT) {
                slots.addAll(generateSlots(doctor.getDoctorId(), date, exception.getStartTime(), exception.getEndTime(), 30, now));
                hasOnline = true;
                scheduleBlocks.add(CalendarDayResponse.ScheduleBlock.builder()
                        .startTime(exception.getStartTime())
                        .endTime(exception.getEndTime())
                        .consultationType("Online")
                        .build());
                if ("NO_SCHEDULE".equals(status)) {
                    status = "WORKING";
                }
            }
        }

        // Sort slots by start time
        slots.sort((a, b) -> a.getStartTime().compareTo(b.getStartTime()));
        scheduleBlocks.sort((a, b) -> a.getStartTime().compareTo(b.getStartTime()));

        return CalendarDayResponse.builder()
                .date(date)
                .dayName(dayName)
                .status(status)
                .scheduleBlocks(scheduleBlocks)
                .hasOnline(hasOnline)
                .hasHomeVisit(hasHomeVisit)
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
                .shiftType(schedule.getShiftType())
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
                .shiftType(schedule.getShiftType())
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
     * Calculate total working hours for the current month.
     *
     * @param doctorId the doctor ID
     * @return total hours for the current month
     */
    private double calculateMonthlyHours(String doctorId) {
        return calculateHoursForMonth(doctorId, YearMonth.now());
    }

    /**
     * Calculate total working hours for an arbitrary month by iterating through each day.
     * This accounts for:
     * - Regular schedules for each day of week
     * - Exceptions (DayOff, Modified, AddSlot)
     *
     * @param doctorId    the doctor ID
     * @param targetMonth the month to calculate hours for
     * @return total hours for the target month
     */
    private double calculateHoursForMonth(String doctorId, YearMonth targetMonth) {
        LocalDate startDate = targetMonth.atDay(1);
        LocalDate endDate = targetMonth.atEndOfMonth();

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
        boolean wasNeedingReconfirmation = Boolean.TRUE.equals(doctor.getNeedsScheduleReconfirmation());
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

        // Any manual schedule edit resolves a pending monthly reconfirmation prompt
        if (oldStatus != newStatus || wasNeedingReconfirmation) {
            doctor.setScheduleStatus(newStatus);
            doctor.setNeedsScheduleReconfirmation(false);
            doctorRepository.save(doctor);
            log.info("Doctor {} schedule status changed: {} -> {}", doctorId, oldStatus, newStatus);

            if (oldStatus != newStatus) {
                // Notify doctor about status change
                notifyDoctorScheduleStatusChange(doctor, oldStatus, newStatus);
            }
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
