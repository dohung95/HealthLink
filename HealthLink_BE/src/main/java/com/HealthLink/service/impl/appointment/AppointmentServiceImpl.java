package com.HealthLink.service.impl.appointment;

import com.HealthLink.dto.request.AppointmentRequest;
import com.HealthLink.dto.request.CancelAppointmentRequest;
import com.HealthLink.dto.request.HoldSlotRequest;
import com.HealthLink.dto.request.RescheduleAppointmentRequest;
import com.HealthLink.dto.response.AppointmentResponse;
import com.HealthLink.dto.response.AvailableSlotResponse;
import com.HealthLink.dto.response.AvailableSlotsResponse;
import com.HealthLink.dto.response.DoctorDailyAppointmentsResponse;
import com.HealthLink.dto.response.HoldSlotResponse;
import com.HealthLink.dto.response.PagedResponse;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.AppointmentSlotHold;
import com.HealthLink.entity.Consultation;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.DoctorSchedule;
import com.HealthLink.entity.DoctorScheduleException;
import com.HealthLink.entity.Patient;
import com.HealthLink.entity.User;
import com.HealthLink.entity.HomeVisitDetails;
import com.HealthLink.entity.enums.NotificationType;
import com.HealthLink.entity.enums.ScheduleExceptionType;
import com.HealthLink.exception.BusinessException;
import com.HealthLink.utility.DoctorServiceHelper;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.repository.appointment.AppointmentSlotHoldRepository;
import com.HealthLink.repository.appointment.HomeVisitDetailsRepository;
import com.HealthLink.repository.admin.DoctorScheduleExceptionRepository;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.repository.doctor.DoctorScheduleRepository;
import com.HealthLink.repository.patient.PatientRepository;
import com.HealthLink.service.appointment.AppointmentService;
import com.HealthLink.service.notification.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import com.HealthLink.dto.response.HomeVisitEstimateResponse;
import com.HealthLink.service.homevisit.HomeVisitLocationService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AppointmentServiceImpl implements AppointmentService {

    private static final String STATUS_CANCELLED = "CANCELLED";
    private static final String STATUS_SCHEDULED = "SCHEDULED";

    private static final DateTimeFormatter NOTIFICATION_TIME_FORMATTER
            = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final DoctorScheduleRepository scheduleRepository;
    private final DoctorScheduleExceptionRepository exceptionRepository;
    private final AppointmentSlotHoldRepository appointmentSlotHoldRepository;
    private final HomeVisitDetailsRepository homeVisitDetailsRepository;
    private final NotificationService notificationService;
    private final HomeVisitLocationService homeVisitLocationService;

    @Value("${booking.max-days-ahead}")
    private Integer maxDaysAhead;

    @Value("${booking.slot-hold-minutes}")
    private Integer slotHoldMinutes;

    @Value("${booking.cancel-min-hours-online:2}")
    private Integer cancelMinHoursOnline;

    @Value("${booking.cancel-min-hours-home-visit:6}")
    private Integer cancelMinHoursHomeVisit;

    @Override
    @Transactional
    public AppointmentResponse createAppointment(AppointmentRequest request) {
        validateRequest(request);
        request.setConsultationType(
                normalizeConsultationTypeForBooking(request.getConsultationType())
        );
        validateHomeVisitRequest(request);

        Patient patient = patientRepository.findById(request.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException(
                "Not found patient ID: " + request.getPatientId()));

        Doctor doctor = doctorRepository.findById(request.getDoctorId())
                .orElseThrow(() -> new ResourceNotFoundException(
                "Bot found doctor ID: " + request.getDoctorId()));

        checkConsultationTypeSupported(doctor, request.getConsultationType());

        HomeVisitEstimateResponse homeVisitEstimate = null;

        if (TYPE_HOME_VISIT.equalsIgnoreCase(request.getConsultationType())) {
            homeVisitEstimate = homeVisitLocationService.estimate(
                    request.getDoctorId(),
                    request.getVisitLatitude(),
                    request.getVisitLongitude()
            );

            if (!Boolean.TRUE.equals(homeVisitEstimate.getServiceable())) {
                throw new BusinessException(homeVisitEstimate.getMessage());
            }
        }

        LocalDateTime appointmentTime = request.getAppointmentTime();
        int dayOfWeek = appointmentTime.getDayOfWeek().getValue() % 7;
        LocalTime requestedTime = appointmentTime.toLocalTime();

        List<DoctorSchedule> schedulesOfDay = scheduleRepository
                .findByDoctor_DoctorIdAndDayOfWeekAndAvailableTrueAndScheduleStatus(
                        doctor.getDoctorId(), dayOfWeek, com.HealthLink.entity.enums.DoctorScheduleStatus.APPROVED);

        if (schedulesOfDay.isEmpty()) {
            throw new BusinessException("Doctor busy at " + getDayName(dayOfWeek));
        }

        DoctorSchedule matchedSchedule = schedulesOfDay.stream()
                .filter(s -> isConsultationTypeMatch(s, request.getConsultationType()))
                .filter(s -> !requestedTime.isBefore(s.getStartTime())
                && requestedTime.isBefore(s.getEndTime()))
                .filter(s -> isAlignedWithSlot(s, requestedTime))
                .findFirst()
                .orElseThrow(() -> new BusinessException(
                "Doctor does not have a suitable working shift at "
                + requestedTime + " for consultation type " + request.getConsultationType()));

        int slotMinutes = Objects.requireNonNullElse(matchedSchedule.getSlotDuration(), 30);
        LocalDateTime slotStart = appointmentTime;
        LocalDateTime slotEnd = appointmentTime.plusMinutes(slotMinutes);

        boolean hasConflict = appointmentRepository.existsDoctorAppointmentOverlap(
                doctor.getDoctorId(),
                STATUS_CANCELLED,
                slotStart,
                slotEnd
        );

        if (hasConflict) {
            throw new BusinessException(
                    "The doctor already has another appointment during this time slot (" + slotMinutes + " mins/slot)");
        }

        LocalDateTime now = LocalDateTime.now();

        List<AppointmentSlotHold> overlappingHolds
                = appointmentSlotHoldRepository.findDoctorHoldOverlaps(
                        doctor.getDoctorId(),
                        slotStart,
                        slotEnd,
                        now
                );

        for (AppointmentSlotHold hold : overlappingHolds) {
            if (!hold.getPatient().getPatientId().equals(patient.getPatientId())) {
                throw new BusinessException("This slot is currently being held by another patient");
            }
        }

        Appointment appointment = Appointment.builder()
                .patient(patient)
                .doctor(doctor)
                .appointmentTime(appointmentTime)
                .endTime(appointmentTime.plusMinutes(slotMinutes))
                .consultationType(request.getConsultationType())
                .status(STATUS_SCHEDULED)
                .symptoms(request.getSymptoms())
                .notes(request.getNotes())
                .fee(homeVisitEstimate != null
                        ? doctor.getConsultationFee()
                                .add(homeVisitEstimate.getTotalFee() != null
                                        ? homeVisitEstimate.getTotalFee()
                                        : BigDecimal.ZERO)
                                .setScale(2, RoundingMode.HALF_UP)
                        : doctor.getConsultationFee())
                .build();

        Appointment saved = appointmentRepository.save(appointment);

        if (TYPE_HOME_VISIT.equalsIgnoreCase(request.getConsultationType())) {
            HomeVisitDetails homeVisitDetails = buildHomeVisitDetails(
                    saved,
                    request,
                    homeVisitEstimate
            );
            homeVisitDetailsRepository.save(homeVisitDetails);
            saved.setHomeVisitDetails(homeVisitDetails);
        }

        appointmentSlotHoldRepository
                .findByDoctor_DoctorIdAndAppointmentTimeAndExpiresAtAfter(
                        doctor.getDoctorId(),
                        appointmentTime,
                        now
                )
                .ifPresent(appointmentSlotHoldRepository::delete);

        return toResponse(saved);
    }

    @Override
    public AvailableSlotsResponse getAvailableSlots(String doctorId, LocalDate date, String consultationType) {
        validateBookingDate(date);
        consultationType = normalizeConsultationTypeForBooking(consultationType);

        // Check for schedule exceptions on this date
        java.util.Optional<DoctorScheduleException> exceptionOpt = exceptionRepository
                .findByDoctor_DoctorIdAndExceptionDate(doctorId, date);

        // If DayOff exception exists, return empty slots
        if (exceptionOpt.isPresent() && exceptionOpt.get().getExceptionType() == ScheduleExceptionType.DAY_OFF) {
            log.info("Doctor {} has DayOff exception on {}, returning empty slots", doctorId, date);
            return AvailableSlotsResponse.builder()
                    .doctorId(doctorId)
                    .date(date)
                    .bookingWindowDays(maxDaysAhead)
                    .slots(List.of())
                    .build();
        }

        int dayOfWeek = date.getDayOfWeek().getValue() % 7;

        List<DoctorSchedule> schedules = scheduleRepository
                .findByDoctor_DoctorIdAndDayOfWeekAndAvailableTrueAndScheduleStatus(
                        doctorId, dayOfWeek, com.HealthLink.entity.enums.DoctorScheduleStatus.APPROVED);

        LocalDateTime dayStart = date.atStartOfDay();
        LocalDateTime dayEnd = date.plusDays(1).atStartOfDay().minusSeconds(1);

        List<Appointment> bookedAppointments = appointmentRepository
                .findByDoctor_DoctorIdAndStatusNotAndAppointmentTimeBetween(
                        doctorId,
                        STATUS_CANCELLED,
                        dayStart,
                        dayEnd
                );

        LocalDateTime now = LocalDateTime.now();

        List<AppointmentSlotHold> activeHolds = appointmentSlotHoldRepository
                .findByDoctor_DoctorIdAndAppointmentTimeBetweenAndExpiresAtAfter(
                        doctorId,
                        dayStart,
                        dayEnd,
                        now
                );

        List<AvailableSlotResponse> slots = new ArrayList<>();

        // Check if Modified exception - use exception hours instead of schedule
        if (exceptionOpt.isPresent() && exceptionOpt.get().getExceptionType() == ScheduleExceptionType.MODIFIED) {
            DoctorScheduleException modifiedException = exceptionOpt.get();
            log.info("Doctor {} has Modified exception on {}, using exception hours: {} - {}",
                    doctorId, date, modifiedException.getStartTime(), modifiedException.getEndTime());

            // Generate slots from exception's time range with default 30 min duration
            int slotMinutes = 30;
            // Try to get slot duration from first schedule if available
            if (!schedules.isEmpty() && schedules.get(0).getSlotDuration() != null) {
                slotMinutes = schedules.get(0).getSlotDuration();
            }

            generateSlotsForTimeRange(
                    slots, date, modifiedException.getStartTime(), modifiedException.getEndTime(),
                    slotMinutes, bookedAppointments, activeHolds, now
            );
        } else {
            // Normal flow: generate slots from schedules
            for (DoctorSchedule schedule : schedules) {
                if (!isConsultationTypeMatch(schedule, consultationType)) {
                    continue;
                }

                int slotMinutes = schedule.getSlotDuration() == null
                        ? 30
                        : schedule.getSlotDuration();

                generateSlotsForTimeRange(
                        slots, date, schedule.getStartTime(), schedule.getEndTime(),
                        slotMinutes, bookedAppointments, activeHolds, now
                );
            }
        }

        // Check for AddSlot exception - add extra slots
        if (exceptionOpt.isPresent() && exceptionOpt.get().getExceptionType() == ScheduleExceptionType.ADD_SLOT) {
            DoctorScheduleException addSlotException = exceptionOpt.get();
            log.info("Doctor {} has AddSlot exception on {}, adding extra slots: {} - {}",
                    doctorId, date, addSlotException.getStartTime(), addSlotException.getEndTime());

            int slotMinutes = 30;
            if (!schedules.isEmpty() && schedules.get(0).getSlotDuration() != null) {
                slotMinutes = schedules.get(0).getSlotDuration();
            }

            generateSlotsForTimeRange(
                    slots, date, addSlotException.getStartTime(), addSlotException.getEndTime(),
                    slotMinutes, bookedAppointments, activeHolds, now
            );
        }

        // Sort slots by start time
        slots.sort((a, b) -> a.getStartTime().compareTo(b.getStartTime()));

        return AvailableSlotsResponse.builder()
                .doctorId(doctorId)
                .date(date)
                .bookingWindowDays(maxDaysAhead)
                .slots(slots)
                .build();
    }

    /**
     * Helper method to generate slots for a given time range
     */
    private void generateSlotsForTimeRange(
            List<AvailableSlotResponse> slots,
            LocalDate date,
            LocalTime startTime,
            LocalTime endTime,
            int slotMinutes,
            List<Appointment> bookedAppointments,
            List<AppointmentSlotHold> activeHolds,
            LocalDateTime now
    ) {
        LocalDateTime slotStart = LocalDateTime.of(date, startTime);
        LocalDateTime scheduleEnd = LocalDateTime.of(date, endTime);

        while (!slotStart.plusMinutes(slotMinutes).isAfter(scheduleEnd)) {
            LocalDateTime currentSlotStart = slotStart;
            LocalDateTime currentSlotEnd = slotStart.plusMinutes(slotMinutes);

            // Skip past slots
            if (currentSlotStart.isBefore(now)) {
                slotStart = currentSlotEnd;
                continue;
            }

            boolean isBooked = bookedAppointments.stream()
                    .anyMatch(appointment -> isAppointmentOverlappingSlot(
                    appointment,
                    currentSlotStart,
                    currentSlotEnd
            ));

            boolean isHeld = activeHolds.stream()
                    .anyMatch(hold -> isHoldOverlappingSlot(
                    hold,
                    currentSlotStart,
                    currentSlotEnd
            ));

            String status;
            boolean selectable;

            if (isBooked) {
                status = "BOOKED";
                selectable = false;
            } else if (isHeld) {
                status = "HELD";
                selectable = false;
            } else {
                status = "AVAILABLE";
                selectable = true;
            }

            slots.add(AvailableSlotResponse.builder()
                    .startTime(currentSlotStart.toLocalTime().toString())
                    .endTime(currentSlotEnd.toLocalTime().toString())
                    .status(status)
                    .selectable(selectable)
                    .build());

            slotStart = currentSlotEnd;
        }
    }

    private boolean isAppointmentOverlappingSlot(
            Appointment appointment,
            LocalDateTime slotStart,
            LocalDateTime slotEnd
    ) {
        LocalDateTime appointmentStart = appointment.getAppointmentTime();
        LocalDateTime appointmentEnd = appointment.getEndTime();

        if (appointmentEnd == null) {
            appointmentEnd = appointmentStart.plusMinutes(30);
        }

        return appointmentStart.isBefore(slotEnd)
                && appointmentEnd.isAfter(slotStart);
    }

    private boolean isHoldOverlappingSlot(
            AppointmentSlotHold hold,
            LocalDateTime slotStart,
            LocalDateTime slotEnd
    ) {
        LocalDateTime holdStart = hold.getAppointmentTime();
        LocalDateTime holdEnd = hold.getEndTime();

        if (holdEnd == null) {
            holdEnd = holdStart.plusMinutes(30);
        }

        return holdStart.isBefore(slotEnd)
                && holdEnd.isAfter(slotStart);
    }

    @Override
    public HoldSlotResponse holdSlot(HoldSlotRequest request) {
        if (request.getDoctorId() == null || request.getDoctorId().isBlank()) {
            throw new BusinessException("Doctor ID is required");
        }
        if (request.getPatientId() == null || request.getPatientId().isBlank()) {
            throw new BusinessException("Patient ID is required");
        }
        if (request.getAppointmentTime() == null) {
            throw new BusinessException("Appointment time is required");
        }

        validateBookingDate(request.getAppointmentTime().toLocalDate());

        request.setConsultationType(
                normalizeConsultationTypeForBooking(request.getConsultationType())
        );

        Doctor doctor = doctorRepository.findById(request.getDoctorId())
                .orElseThrow(() -> new ResourceNotFoundException(
                "Doctor not found with ID: " + request.getDoctorId()));

        Patient patient = patientRepository.findById(request.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException(
                "Patient not found with ID: " + request.getPatientId()));

        LocalDateTime appointmentTime = request.getAppointmentTime();
        int dayOfWeek = appointmentTime.getDayOfWeek().getValue() % 7;
        LocalTime requestedTime = appointmentTime.toLocalTime();

        List<DoctorSchedule> schedulesOfDay = scheduleRepository
                .findByDoctor_DoctorIdAndDayOfWeekAndAvailableTrueAndScheduleStatus(
                        doctor.getDoctorId(),
                        dayOfWeek,
                        com.HealthLink.entity.enums.DoctorScheduleStatus.APPROVED
                );

        DoctorSchedule matchedSchedule = schedulesOfDay.stream()
                .filter(s -> isConsultationTypeMatch(s, request.getConsultationType()))
                .filter(s -> !requestedTime.isBefore(s.getStartTime())
                && requestedTime.isBefore(s.getEndTime()))
                .filter(s -> isAlignedWithSlot(s, requestedTime))
                .findFirst()
                .orElseThrow(() -> new BusinessException(
                "Doctor does not have a suitable working shift at this time"));

        int slotMinutes = Objects.requireNonNullElse(matchedSchedule.getSlotDuration(), 30);
        LocalDateTime slotEnd = appointmentTime.plusMinutes(slotMinutes);

        boolean hasBookedConflict = appointmentRepository.existsDoctorAppointmentOverlap(
                doctor.getDoctorId(),
                STATUS_CANCELLED,
                appointmentTime,
                slotEnd
        );

        if (hasBookedConflict) {
            throw new BusinessException("This slot has already been booked");
        }

        LocalDateTime now = LocalDateTime.now();

        boolean hasActiveHold = appointmentSlotHoldRepository.existsDoctorHoldOverlap(
                doctor.getDoctorId(),
                appointmentTime,
                slotEnd,
                now
        );

        if (hasActiveHold) {
            throw new BusinessException("This slot is currently being held by another patient");
        }

        AppointmentSlotHold hold = AppointmentSlotHold.builder()
                .doctor(doctor)
                .patient(patient)
                .appointmentTime(appointmentTime)
                .endTime(slotEnd)
                .consultationType(request.getConsultationType())
                .expiresAt(now.plusMinutes(slotHoldMinutes))
                .build();

        AppointmentSlotHold savedHold = appointmentSlotHoldRepository.save(hold);

        return HoldSlotResponse.builder()
                .holdId(savedHold.getHoldId())
                .expiresAt(savedHold.getExpiresAt())
                .status("HELD")
                .build();
    }

    @Override
    @Transactional
    public void releaseHold(Integer holdId) {
        AppointmentSlotHold hold = appointmentSlotHoldRepository.findById(holdId)
                .orElseThrow(() -> new ResourceNotFoundException(
                "Hold not found with ID: " + holdId));

        appointmentSlotHoldRepository.delete(hold);
    }

    @Override
    public List<AppointmentResponse> getPatientAppointments(String patientId) {
        patientRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException(
                "not found patient with ID: " + patientId));

        return appointmentRepository
                .findByPatient_PatientIdOrderByAppointmentTimeDesc(patientId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public PagedResponse<AppointmentResponse> getPatientAppointmentsPaged(
            String patientId,
            int page,
            int size,
            String status
    ) {
        patientRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException(
                "not found patient with ID: " + patientId));

        int safePage = Math.max(page, 1);
        int safeSize = Math.min(Math.max(size, 1), 50);

        String normalizedStatus
                = status == null || status.isBlank()
                ? "ALL"
                : status.trim().toUpperCase();

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiredBefore = now.minusMinutes(30);

        Page<Appointment> appointmentPage
                = appointmentRepository.findPatientAppointmentsOrdered(
                        patientId,
                        normalizedStatus,
                        now,
                        expiredBefore,
                        PageRequest.of(safePage - 1, safeSize)
                );

        return PagedResponse.<AppointmentResponse>builder()
                .items(appointmentPage.getContent()
                        .stream()
                        .map(this::toResponse)
                        .collect(Collectors.toList()))
                .page(safePage)
                .pageSize(safeSize)
                .totalItems(appointmentPage.getTotalElements())
                .totalPages(appointmentPage.getTotalPages())
                .build();
    }

    @Override
    public List<AppointmentResponse> getDoctorAppointments(String doctorId) {
        doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException(
                "not found doctor with ID: " + doctorId));

        return appointmentRepository
                .findByDoctor_DoctorIdOrderByAppointmentTimeDesc(doctorId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public DoctorDailyAppointmentsResponse getDoctorDailyAppointments(String doctorId, LocalDate date, String status) {
        doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException(
                "not found doctor with ID: " + doctorId));

        if (date == null) {
            throw new BusinessException("Date is required");
        }

        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.plusDays(1).atStartOfDay();
        List<Appointment> dailyAppointments = appointmentRepository.findDoctorDailyAppointments(
                doctorId,
                start,
                end
        );

        String normalizedStatus = status == null || status.isBlank() || "All".equalsIgnoreCase(status)
                ? null
                : status.trim();

        List<AppointmentResponse> appointments = dailyAppointments.stream()
                .filter(appointment -> normalizedStatus == null
                || normalizedStatus.equalsIgnoreCase(appointment.getStatus()))
                .map(this::toResponse)
                .collect(Collectors.toList());

        return DoctorDailyAppointmentsResponse.builder()
                .doctorId(doctorId)
                .date(date)
                .appointments(appointments)
                .counts(DoctorDailyAppointmentsResponse.Counts.builder()
                        .all(dailyAppointments.size())
                        .scheduled(countByStatus(dailyAppointments, "SCHEDULED"))
                        .inprogress(countByStatus(dailyAppointments, "IN_CONSULTATION"))
                        .completed(countByStatus(dailyAppointments, "COMPLETED"))
                        .cancelled(countByStatus(dailyAppointments, "CANCELLED"))
                        .build())
                .build();
    }

    @Override
    public AppointmentResponse getAppointmentById(Integer id) {
        return toResponse(
                appointmentRepository.findById(id)
                        .orElseThrow(() -> new ResourceNotFoundException(
                        "Khong tim thay lich hen voi ID: " + id)));
    }

    @Override
    @Transactional
    public AppointmentResponse cancelAppointment(Integer id, CancelAppointmentRequest request) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                "mot found appointment with ID: " + id));

        String cancelledBy = request.getCancelledBy();
        if (cancelledBy == null || cancelledBy.isBlank()) {
            throw new BusinessException("cancelledBy is required");
        }
        if (!cancelledBy.equals("Patient") && !cancelledBy.equals("Doctor")) {
            throw new BusinessException(
                    "cancelledBy must be 'Patient' or 'Doctor', but got: '" + cancelledBy + "'");
        }
        if (request.getCancelReason() == null || request.getCancelReason().isBlank()) {
            throw new BusinessException("Cancel reason is required");
        }
        if (STATUS_CANCELLED.equalsIgnoreCase(appointment.getStatus())) {
            throw new BusinessException("This appointment has already been canceled");
        }
        if ("COMPLETED".equalsIgnoreCase(appointment.getStatus())) {
            throw new BusinessException("Completed appointments cannot be canceled");
        }
        if ("IN_CONSULTATION".equalsIgnoreCase(appointment.getStatus())) {
            throw new BusinessException("Cannot cancel an appointment that is in consultation");
        }
        int cancelMinHours = getCancelMinHours(appointment.getConsultationType());

        if (appointment.getAppointmentTime().isBefore(LocalDateTime.now().plusHours(cancelMinHours))) {
            String appointmentType = normalizeConsultationTypeForBooking(appointment.getConsultationType());

            throw new BusinessException(
                    appointmentType.equalsIgnoreCase(TYPE_HOME_VISIT)
                    ? "Home visit appointments can only be cancelled at least "
                    + cancelMinHours + " hours before the scheduled time"
                    : "Online appointments can only be cancelled at least "
                    + cancelMinHours + " hours before the scheduled time"
            );
        }

        appointment.setStatus(STATUS_CANCELLED);
        appointment.setCancelReason(request.getCancelReason());
        appointment.setCancelledBy(request.getCancelledBy());
        appointment.setCancelledAt(LocalDateTime.now());

        Appointment saved = appointmentRepository.save(appointment);
        notifyDoctorAboutCancelledAppointmentAfterCommit(saved);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public AppointmentResponse rescheduleAppointment(Integer id, RescheduleAppointmentRequest request) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                "Not found appointment with ID: " + id));

        if (STATUS_CANCELLED.equalsIgnoreCase(appointment.getStatus())) {
            throw new BusinessException("Cannot reschedule a cancelled appointment");
        }
        if ("COMPLETED".equalsIgnoreCase(appointment.getStatus())) {
            throw new BusinessException("Cannot reschedule a completed appointment");
        }
        if ("IN_CONSULTATION".equalsIgnoreCase(appointment.getStatus())) {
            throw new BusinessException("Cannot reschedule an appointment that is in consultation");
        }
        if (appointment.getAppointmentTime().isBefore(LocalDateTime.now().plusHours(2))) {
            throw new BusinessException(
                    "Cannot reschedule an appointment less than 2 hours before the scheduled time");
        }

        LocalDateTime newTime = request.getNewAppointmentTime();
        if (newTime == null) {
            throw new BusinessException("New appointment time is required");
        }
        if (!newTime.isAfter(LocalDateTime.now())) {
            throw new BusinessException("New appointment time must be in the future");
        }

        Doctor doctor = appointment.getDoctor();
        int newDayOfWeek = newTime.getDayOfWeek().getValue() % 7;
        LocalTime newRequestedTime = newTime.toLocalTime();

        List<DoctorSchedule> schedulesOfDay = scheduleRepository
                .findByDoctor_DoctorIdAndDayOfWeekAndAvailableTrue(doctor.getDoctorId(), newDayOfWeek);

        if (schedulesOfDay.isEmpty()) {
            throw new BusinessException("Doctor is not available on " + getDayName(newDayOfWeek));
        }

        DoctorSchedule matchedSchedule = schedulesOfDay.stream()
                .filter(s -> isConsultationTypeMatch(s, appointment.getConsultationType()))
                .filter(s -> !newRequestedTime.isBefore(s.getStartTime())
                && newRequestedTime.isBefore(s.getEndTime()))
                .filter(s -> isAlignedWithSlot(s, newRequestedTime))
                .findFirst()
                .orElseThrow(() -> new BusinessException(
                "Doctor does not have a suitable working shift at "
                + newRequestedTime + " for consultation type " + appointment.getConsultationType()));

        int slotMinutes = Objects.requireNonNullElse(matchedSchedule.getSlotDuration(), 30);
        LocalDateTime slotStart = newTime;
        LocalDateTime slotEnd = newTime.plusMinutes(slotMinutes);

        boolean hasConflict = appointmentRepository.existsDoctorAppointmentOverlapExcludingAppointment(
                doctor.getDoctorId(),
                STATUS_CANCELLED,
                slotStart,
                slotEnd,
                id
        );

        if (hasConflict) {
            throw new BusinessException(
                    "Doctor already has another appointment in this time slot (" + slotMinutes + " mins/slot)");
        }

        appointment.setRescheduledFrom(appointment.getAppointmentId());
        appointment.setAppointmentTime(newTime);
        appointment.setEndTime(newTime.plusMinutes(slotMinutes));

        Appointment saved = appointmentRepository.save(appointment);
        notifyDoctorAboutRescheduledAppointmentAfterCommit(saved);
        return toResponse(saved);
    }

    private long countByStatus(List<Appointment> appointments, String status) {
        return appointments.stream()
                .filter(appointment -> status.equalsIgnoreCase(appointment.getStatus()))
                .count();
    }

    private void validateRequest(AppointmentRequest request) {
        if (request.getPatientId() == null || request.getPatientId().isBlank()) {
            throw new BusinessException("Patient ID not null");
        }
        if (request.getDoctorId() == null || request.getDoctorId().isBlank()) {
            throw new BusinessException("Doctor ID not null");
        }
        if (request.getAppointmentTime() == null) {
            throw new BusinessException("Consultation time cannot be empty");
        }
        if (request.getAppointmentTime().isBefore(LocalDateTime.now())) {
            throw new BusinessException("Consultation time must be in the future");
        }
        validateBookingDate(request.getAppointmentTime().toLocalDate());
        if (request.getConsultationType() == null || request.getConsultationType().isBlank()) {
            throw new BusinessException("Consultation type cannot be empty");
        }
    }

    private void validateHomeVisitRequest(AppointmentRequest request) {
        if (!TYPE_HOME_VISIT.equalsIgnoreCase(request.getConsultationType())) {
            return;
        }

        requireText(request.getVisitAddress(), "Visit address is required for home visit");
        requireText(request.getContactPhone(), "Contact phone is required for home visit");
        requireText(request.getReasonForHomeVisit(), "Reason for home visit is required");

        if (request.getIsForSelf() == null) {
            throw new BusinessException("Please specify whether the visit is for yourself or someone else");
        }

        if (!request.getIsForSelf()) {
            requireText(request.getReceiverName(), "Receiver name is required");
            requireText(request.getReceiverRelationship(), "Receiver relationship is required");

            if (request.getReceiverAge() == null || request.getReceiverAge() <= 0) {
                throw new BusinessException("Receiver age must be greater than 0");
            }
        }
    }

    private void requireText(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new BusinessException(message);
        }
    }

    private void checkConsultationTypeSupported(Doctor doctor, String consultationType) {
        if (!DoctorServiceHelper.isConsultationTypeSupported(doctor, consultationType)) {
            throw new BusinessException(
                    "Doctor " + doctor.getFullName()
                    + " does not support consultation type: " + consultationType);
        }
    }

    private boolean isConsultationTypeMatch(DoctorSchedule schedule, String consultationType) {
        String normalizedType = normalizeConsultationTypeForBooking(consultationType);
        String scheduleType = schedule.getConsultationType();

        if (TYPE_ONLINE.equalsIgnoreCase(normalizedType)) {
            return isOnlineScheduleType(scheduleType);
        }

        if (TYPE_HOME_VISIT.equalsIgnoreCase(normalizedType)) {
            return isHomeVisitScheduleType(scheduleType);
        }

        return true;
    }

    private boolean isAlignedWithSlot(DoctorSchedule schedule, LocalTime requestedTime) {
        int minutesFromStart = (int) java.time.Duration
                .between(schedule.getStartTime(), requestedTime)
                .toMinutes();

        int slotMinutes = Objects.requireNonNullElse(schedule.getSlotDuration(), 30);
        return minutesFromStart >= 0 && minutesFromStart % slotMinutes == 0;
    }

    private void notifyDoctorAboutNewAppointmentAfterCommit(Appointment appointment) {
        User doctorUser = resolveDoctorUser(appointment, NotificationType.NEW_APPOINTMENT);
        if (doctorUser == null) {
            return;
        }

        String patientName = safeValue(appointment.getPatient().getFullName(), "Unknown patient");
        String appointmentTime = formatAppointmentTime(appointment.getAppointmentTime());
        String consultationType = safeValue(appointment.getConsultationType(), "consultation");
        Integer appointmentId = appointment.getAppointmentId();
        String actionUrl = "/appointments/" + appointmentId;

        runAfterCommit("new appointment notification appointmentId=" + appointmentId, () -> {
            notificationService.sendWebSocketNotification(
                    doctorUser,
                    NotificationType.NEW_APPOINTMENT,
                    "New appointment booked",
                    String.format(
                            "%s booked a %s appointment at %s.",
                            patientName,
                            consultationType,
                            appointmentTime
                    ),
                    appointmentId,
                    actionUrl
            );
            log.info("New appointment notification queued for doctorUserId={}, appointmentId={}",
                    doctorUser.getId(), appointmentId);
        });
    }

    private void notifyDoctorAboutCancelledAppointmentAfterCommit(Appointment appointment) {
        User doctorUser = resolveDoctorUser(appointment, NotificationType.CANCEL_APPOINTMENT);
        if (doctorUser == null) {
            return;
        }

        String patientName = safeValue(appointment.getPatient().getFullName(), "Unknown patient");
        String appointmentTime = formatAppointmentTime(appointment.getAppointmentTime());
        String cancelledBy = safeValue(appointment.getCancelledBy(), "Unknown");
        String cancelReason = safeValue(appointment.getCancelReason(), "No reason provided");
        Integer appointmentId = appointment.getAppointmentId();
        String actionUrl = "/appointments/" + appointmentId;

        runAfterCommit("cancel appointment notification appointmentId=" + appointmentId, () -> {
            notificationService.sendWebSocketNotification(
                    doctorUser,
                    NotificationType.CANCEL_APPOINTMENT,
                    "Appointment cancelled",
                    String.format(
                            "%s's appointment at %s was cancelled by %s. Reason: %s",
                            patientName,
                            appointmentTime,
                            cancelledBy,
                            cancelReason
                    ),
                    appointmentId,
                    actionUrl
            );
            log.info("Cancel appointment notification queued for doctorUserId={}, appointmentId={}",
                    doctorUser.getId(), appointmentId);
        });
    }

    private void notifyDoctorAboutRescheduledAppointmentAfterCommit(Appointment appointment) {
        User doctorUser = resolveDoctorUser(appointment, NotificationType.RESCHEDULE_APPOINTMENT);
        if (doctorUser == null) {
            return;
        }

        String patientName = safeValue(appointment.getPatient().getFullName(), "Unknown patient");
        String appointmentTime = formatAppointmentTime(appointment.getAppointmentTime());
        Integer appointmentId = appointment.getAppointmentId();
        String actionUrl = "/appointments/" + appointmentId;

        runAfterCommit("reschedule appointment notification appointmentId=" + appointmentId, () -> {
            notificationService.sendWebSocketNotification(
                    doctorUser,
                    NotificationType.RESCHEDULE_APPOINTMENT,
                    "Appointment rescheduled",
                    String.format(
                            "%s's appointment was rescheduled to %s.",
                            patientName,
                            appointmentTime
                    ),
                    appointmentId,
                    actionUrl
            );
            log.info("Reschedule appointment notification queued for doctorUserId={}, appointmentId={}",
                    doctorUser.getId(), appointmentId);
        });
    }

    private User resolveDoctorUser(Appointment appointment, NotificationType type) {
        if (appointment == null || appointment.getDoctor() == null) {
            log.warn("Cannot send {} notification: appointment or doctor is missing", type);
            return null;
        }

        User user = appointment.getDoctor().getUser();
        if (user == null || user.getId() == null || user.getId().isBlank()) {
            log.warn("Cannot send {} notification: doctorId={} is not mapped to a user",
                    type, appointment.getDoctor().getDoctorId());
            return null;
        }
        return user;
    }

    private void runAfterCommit(String context, Runnable task) {
        Runnable safeTask = () -> {
            try {
                task.run();
            } catch (Exception ex) {
                log.error("Failed to send {} after commit: {}", context, ex.getMessage(), ex);
            }
        };

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    safeTask.run();
                }
            });
            return;
        }

        safeTask.run();
    }

    private String formatAppointmentTime(LocalDateTime appointmentTime) {
        return appointmentTime != null
                ? appointmentTime.format(NOTIFICATION_TIME_FORMATTER)
                : "unknown time";
    }

    private String safeValue(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private AppointmentResponse toResponse(Appointment appointment) {
        Consultation consultation = appointment.getConsultation();
        HomeVisitDetails homeVisit = appointment.getHomeVisitDetails();

        return AppointmentResponse.builder()
                .appointmentId(appointment.getAppointmentId())
                .consultationId(consultation != null ? consultation.getConsultationId() : null)
                .patientId(appointment.getPatient().getPatientId())
                .patientName(appointment.getPatient().getFullName())
                .doctorId(appointment.getDoctor().getDoctorId())
                .doctorName(appointment.getDoctor().getFullName())
                .doctorAvatar(appointment.getDoctor().getAvatarUrl())
                .appointmentTime(appointment.getAppointmentTime())
                .consultationType(appointment.getConsultationType())
                .status(appointment.getStatus())
                .fee(appointment.getFee())
                .symptoms(appointment.getSymptoms())
                .notes(appointment.getNotes())
                .consultationStartTime(consultation != null ? consultation.getStartTime() : null)
                .consultationEndTime(consultation != null ? consultation.getEndTime() : null)
                .cancelledAt(appointment.getCancelledAt())
                .cancelReason(appointment.getCancelReason())
                .cancelledBy(appointment.getCancelledBy())
                .confirmedAt(appointment.getConfirmedAt())
                .specialtyName(resolveSpecialtyName(appointment.getDoctor()))
                .followUpDate(consultation != null ? consultation.getFollowUpDate() : null)
                .followUpAppointmentId(consultation != null ? consultation.getFollowUpAppointmentId() : null)
                .followUpNotes(consultation != null ? consultation.getFollowUpNotes() : null)
                .visitAddress(homeVisit != null ? homeVisit.getVisitAddress() : null)
                .visitCity(homeVisit != null ? homeVisit.getVisitCity() : null)
                .contactPhone(homeVisit != null ? homeVisit.getContactPhone() : null)
                .reasonForHomeVisit(homeVisit != null ? homeVisit.getReasonForHomeVisit() : null)
                .specialNotes(homeVisit != null ? homeVisit.getSpecialNotes() : null)
                .isForSelf(homeVisit != null ? homeVisit.getIsForSelf() : null)
                .receiverName(homeVisit != null ? homeVisit.getReceiverName() : null)
                .receiverAge(homeVisit != null ? homeVisit.getReceiverAge() : null)
                .receiverGender(homeVisit != null ? homeVisit.getReceiverGender() : null)
                .receiverRelationship(homeVisit != null ? homeVisit.getReceiverRelationship() : null)
                .receiverPhone(homeVisit != null ? homeVisit.getReceiverPhone() : null)
                .distanceKm(homeVisit != null ? homeVisit.getDistanceKm() : null)
                .estimatedTravelMinutes(homeVisit != null ? homeVisit.getEstimatedTravelMinutes() : null)
                .visitDurationMinutes(homeVisit != null ? homeVisit.getVisitDurationMinutes() : null)
                .travelBufferBeforeMinutes(homeVisit != null ? homeVisit.getTravelBufferBeforeMinutes() : null)
                .travelBufferAfterMinutes(homeVisit != null ? homeVisit.getTravelBufferAfterMinutes() : null)
                .homeVisitFee(homeVisit != null ? homeVisit.getHomeVisitFee() : null)
                .travelFee(homeVisit != null ? homeVisit.getTravelFee() : null)
                .build();
    }

    private String resolveSpecialtyName(Doctor doctor) {
        if (doctor == null) {
            return null;
        }
        return doctor.getSpecialtyEntity() != null
                ? doctor.getSpecialtyEntity().getName()
                : doctor.getSpecialty();
    }

    private void validateBookingDate(LocalDate date) {
        LocalDate today = LocalDate.now();
        LocalDate latestAllowedDate = today.plusDays(maxDaysAhead);

        if (date.isBefore(today)) {
            throw new BusinessException("Cannot book appointments in the past");
        }
        if (date.isAfter(latestAllowedDate)) {
            throw new BusinessException(
                    "Appointments can only be booked within the next " + maxDaysAhead + " days");
        }
    }

    private String getDayName(int dayOfWeek) {
        String[] names = {"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"};
        return (dayOfWeek >= 0 && dayOfWeek < names.length) ? names[dayOfWeek] : "unknown";
    }

    private static final String TYPE_ONLINE = "Online";
    private static final String TYPE_HOME_VISIT = "HomeVisit";

    private int getCancelMinHours(String consultationType) {
        String normalizedType = normalizeConsultationTypeForBooking(consultationType);

        if (TYPE_HOME_VISIT.equalsIgnoreCase(normalizedType)) {
            return Objects.requireNonNullElse(cancelMinHoursHomeVisit, 6);
        }

        return Objects.requireNonNullElse(cancelMinHoursOnline, 2);
    }

    private String normalizeConsultationTypeForBooking(String consultationType) {
        return DoctorServiceHelper.normalizeConsultationType(consultationType);
    }

    private boolean isOnlineScheduleType(String value) {
        if (value == null || value.isBlank()) {
            return true;
        }

        String type = value.trim().toLowerCase();

        return type.equals("video")
                || type.equals("video call")
                || type.equals("audio")
                || type.equals("audio call")
                || type.equals("chat")
                || type.equals("online")
                || type.equals("consultation");
    }

    private boolean isHomeVisitScheduleType(String value) {
        if (value == null || value.isBlank()) {
            return false;
        }

        String type = value.trim().toLowerCase();

        return type.equals("homevisit")
                || type.equals("home visit")
                || type.equals("home-visit")
                || type.equals("home");
    }

    private HomeVisitDetails buildHomeVisitDetails(
            Appointment appointment,
            AppointmentRequest request,
            HomeVisitEstimateResponse estimate
    ) {
        return HomeVisitDetails.builder()
                .appointment(appointment)
                .visitAddress(request.getVisitAddress())
                .visitCity(request.getVisitCity())
                .contactPhone(request.getContactPhone())
                .reasonForHomeVisit(request.getReasonForHomeVisit())
                .specialNotes(request.getSpecialNotes())
                .isForSelf(request.getIsForSelf())
                .receiverName(request.getReceiverName())
                .receiverAge(request.getReceiverAge())
                .receiverGender(request.getReceiverGender())
                .receiverRelationship(request.getReceiverRelationship())
                .receiverPhone(request.getReceiverPhone())
                .visitLatitude(request.getVisitLatitude())
                .visitLongitude(request.getVisitLongitude())
                .distanceKm(estimate != null ? estimate.getDistanceKm() : null)
                .homeVisitFee(estimate != null ? estimate.getHomeVisitFee() : null)
                .travelFee(estimate != null ? estimate.getTravelFee() : null)
                .visitDurationMinutes(30)
                .build();
    }
}
