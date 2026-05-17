package com.HealthLink.service.impl.appointment;

import com.HealthLink.dto.request.AppointmentRequest;
import com.HealthLink.dto.request.CancelAppointmentRequest;
import com.HealthLink.dto.request.HoldSlotRequest;
import com.HealthLink.dto.request.RescheduleAppointmentRequest;
import com.HealthLink.dto.response.AppointmentResponse;
import com.HealthLink.dto.response.AvailableSlotResponse;
import com.HealthLink.dto.response.AvailableSlotsResponse;
import com.HealthLink.dto.response.HoldSlotResponse;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.AppointmentSlotHold;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.DoctorSchedule;
import com.HealthLink.entity.Patient;
import com.HealthLink.entity.User;
import com.HealthLink.entity.enums.NotificationType;
import com.HealthLink.exception.BusinessException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.repository.appointment.AppointmentSlotHoldRepository;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.repository.doctor.DoctorScheduleRepository;
import com.HealthLink.repository.patient.PatientRepository;
import com.HealthLink.service.appointment.AppointmentService;
<<<<<<< Hiep/feature-reminder-notification
import com.HealthLink.service.notification.NotificationService;
=======
import java.time.LocalDate;
>>>>>>> main
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;
import java.time.LocalTime;
<<<<<<< Hiep/feature-reminder-notification
import java.time.format.DateTimeFormatter;
=======
import java.util.ArrayList;
>>>>>>> main
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;

@Service
@RequiredArgsConstructor
<<<<<<< Hiep/feature-reminder-notification
@Slf4j
public class AppointmentServiceImpl implements AppointmentService{
=======
public class AppointmentServiceImpl implements AppointmentService {
>>>>>>> main

    private static final DateTimeFormatter NOTIFICATION_TIME_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final DoctorScheduleRepository scheduleRepository;
<<<<<<< Hiep/feature-reminder-notification
    private final NotificationService notificationService;
=======
    private final AppointmentSlotHoldRepository appointmentSlotHoldRepository;

    @Value("${booking.max-days-ahead}")
    private Integer maxDaysAhead;

    @Value("${booking.slot-hold-minutes}")
    private Integer slotHoldMinutes;
>>>>>>> main

    // createAppointment
    @Override
    @Transactional
    public AppointmentResponse createAppointment(AppointmentRequest request) {

        validateRequest(request);

        Patient patient = patientRepository.findById(request.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException(
                "Not found patient ID: " + request.getPatientId()));

        Doctor doctor = doctorRepository.findById(request.getDoctorId())
                .orElseThrow(() -> new ResourceNotFoundException(
                "Bot found doctor ID: " + request.getDoctorId()));

        // check doctor can support type consultation
        checkConsultationTypeSupported(doctor, request.getConsultationType());

        // check the work schedule doctor
        // DayOfWeek Java: Monday=1...Sunday=7 → convert 0=CN, 1=T2...6=T7
        LocalDateTime appointmentTime = request.getAppointmentTime();
        int dayOfWeek = appointmentTime.getDayOfWeek().getValue() % 7;
        LocalTime requestedTime = appointmentTime.toLocalTime();

        List<DoctorSchedule> schedulesOfDay = scheduleRepository
                .findByDoctor_DoctorIdAndDayOfWeekAndAvailableTrue(doctor.getDoctorId(), dayOfWeek);

        if (schedulesOfDay.isEmpty()) {
            throw new BusinessException("Doctor busy at "
                    + getDayName(dayOfWeek));
        }

        // Find a matching shift: correct consultation type and time within shift.
        DoctorSchedule matchedSchedule = schedulesOfDay.stream()
                .filter(s -> isConsultationTypeMatch(s, request.getConsultationType()))
                .filter(s -> !requestedTime.isBefore(s.getStartTime())
                && requestedTime.isBefore(s.getEndTime()))
                .filter(s -> isAlignedWithSlot(s, requestedTime))
                .findFirst()
                .orElseThrow(() -> new BusinessException(
                "Doctor does not have a suitable working shift at "
                + requestedTime + " for consultation type " + request.getConsultationType()));

        // Check for schedule conflicts
        int slotMinutes = Objects.requireNonNullElse(matchedSchedule.getSlotDuration(), 30);

        // Appointment mới bị conflict nếu có appointment khác bắt đầu trong khoảng đó
        LocalDateTime slotStart = appointmentTime;
        LocalDateTime slotEnd = appointmentTime.plusMinutes(slotMinutes);

        boolean hasConflict = appointmentRepository
                .existsByDoctor_DoctorIdAndStatusNotAndAppointmentTimeBetween(
                        doctor.getDoctorId(), "Cancelled",
                        slotStart, slotEnd.minusSeconds(1));

        if (hasConflict) {
            throw new BusinessException(
                    "The doctor already has another appointment during this time slot (" + slotMinutes + " mins/slot)");
        }

        LocalDateTime now = LocalDateTime.now();

        appointmentSlotHoldRepository
                .findByDoctor_DoctorIdAndAppointmentTimeAndExpiresAtAfter(
                        doctor.getDoctorId(),
                        appointmentTime,
                        now
                )
                .ifPresent(hold -> {
                    if (!hold.getPatient().getPatientId().equals(patient.getPatientId())) {
                        throw new BusinessException("This slot is currently being held by another patient");
                    }
                });

        // create and save appointment
        LocalDateTime endTime = appointmentTime.plusMinutes(slotMinutes);

        Appointment appointment = Appointment.builder()
                .patient(patient)
                .doctor(doctor)
                .appointmentTime(appointmentTime)
                .endTime(endTime)
                .consultationType(request.getConsultationType())
                .status("Scheduled")
                .symptoms(request.getSymptoms())
                .notes(request.getNotes())
                .fee(doctor.getConsultationFee())
                .build();

<<<<<<< Hiep/feature-reminder-notification
        Appointment saved = appointmentRepository.save(appointment);
        notifyDoctorAboutNewAppointmentAfterCommit(saved);

        return toResponse(saved);
=======
        Appointment savedAppointment = appointmentRepository.save(appointment);

        appointmentSlotHoldRepository
                .findByDoctor_DoctorIdAndAppointmentTimeAndExpiresAtAfter(
                        doctor.getDoctorId(),
                        appointmentTime,
                        now
                )
                .ifPresent(appointmentSlotHoldRepository::delete);

        return toResponse(savedAppointment);

>>>>>>> main
    }

    // get list of all appointment for a specific patient and return list of appointments sorted by the latest first
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

    // View details of an appointment by ID and return Appointment information
    @Override
    public AppointmentResponse getAppointmentById(Integer id) {
        return toResponse(
                appointmentRepository.findById(id)
                        .orElseThrow(() -> new ResourceNotFoundException(
                        "Không tìm thấy lịch hẹn với ID: " + id)));
    }

    // Cancels appointment
    @Override
    @Transactional
    public AppointmentResponse cancelAppointment(Integer id, CancelAppointmentRequest request) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                "mot found appointment with ID: " + id));

        // Kiểm tra cancelledBy hợp lệ
        String cancelledBy = request.getCancelledBy();
        if (cancelledBy == null || cancelledBy.isBlank()) {
            throw new BusinessException("cancelledBy is required");
        }
        if (!cancelledBy.equals("Patient") && !cancelledBy.equals("Doctor")) {
            throw new BusinessException(
                    "cancelledBy must be 'Patient' or 'Doctor', but got: '" + cancelledBy + "'");
        }

        // Lý do hủy là bắt buộc
        if (request.getCancelReason() == null || request.getCancelReason().isBlank()) {
            throw new BusinessException("Cancel reason is required");
        }

        if ("Cancelled".equals(appointment.getStatus())) {
            throw new BusinessException("This appointment has already been canceled");
        }
        if ("Completed".equals(appointment.getStatus())) {
            throw new BusinessException("Completed appointments cannot be canceled");
        }

        // Không cho hủy nếu còn dưới 2 giờ trước giờ khám
        if (appointment.getAppointmentTime().isBefore(LocalDateTime.now().plusHours(2))) {
            throw new BusinessException(
                    "Cannot cancel an appointment less than 2 hours before the scheduled time");
        }

        appointment.setStatus("Cancelled");
        appointment.setCancelReason(request.getCancelReason());
        appointment.setCancelledBy(request.getCancelledBy());
        appointment.setCancelledAt(LocalDateTime.now());

        Appointment saved = appointmentRepository.save(appointment);
        notifyDoctorAboutCancelledAppointmentAfterCommit(saved);

        return toResponse(saved);
    }

    // Dời lịch hẹn sang thời gian mới
    @Override
    @Transactional
    public AppointmentResponse rescheduleAppointment(Integer id, RescheduleAppointmentRequest request) {

        // Tìm appointment
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                "Not found appointment with ID: " + id));

        // Chỉ cho phép reschedule khi đang ở trạng thái Scheduled
        if ("Cancelled".equals(appointment.getStatus())) {
            throw new BusinessException("Cannot reschedule a cancelled appointment");
        }
        if ("Completed".equals(appointment.getStatus())) {
            throw new BusinessException("Cannot reschedule a completed appointment");
        }

        // Không cho reschedule nếu còn dưới 2 giờ trước giờ khám cũ
        if (appointment.getAppointmentTime().isBefore(LocalDateTime.now().plusHours(2))) {
            throw new BusinessException(
                    "Cannot reschedule an appointment less than 2 hours before the scheduled time");
        }

        // Thời gian mới phải hợp lệ
        LocalDateTime newTime = request.getNewAppointmentTime();
        if (newTime == null) {
            throw new BusinessException("New appointment time is required");
        }
        if (!newTime.isAfter(LocalDateTime.now())) {
            throw new BusinessException("New appointment time must be in the future");
        }

        // Kiểm tra bác sĩ có ca làm việc ở ngày/giờ mới không
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
                .findFirst()
                .orElseThrow(() -> new BusinessException(
                "Doctor does not have a suitable working shift at "
                + newRequestedTime + " for consultation type " + appointment.getConsultationType()));

        // Kiểm tra conflict tại slot mới (bỏ qua chính appointment này)
        int slotMinutes = Objects.requireNonNullElse(matchedSchedule.getSlotDuration(), 30);
        LocalDateTime slotStart = newTime;
        LocalDateTime slotEnd = newTime.plusMinutes(slotMinutes);

        boolean hasConflict = appointmentRepository
                .existsByDoctor_DoctorIdAndStatusNotAndAppointmentTimeBetweenAndAppointmentIdNot(
                        doctor.getDoctorId(), "Cancelled",
                        slotStart, slotEnd.minusSeconds(1),
                        id); // loại trừ chính appointment này

        if (hasConflict) {
            throw new BusinessException(
                    "Doctor already has another appointment in this time slot (" + slotMinutes + " mins/slot)");
        }

        // Cập nhật lịch hẹn
        appointment.setRescheduledFrom(appointment.getAppointmentId());
        appointment.setAppointmentTime(newTime);
        appointment.setEndTime(newTime.plusMinutes(slotMinutes));

        return toResponse(appointmentRepository.save(appointment));
    }

    @Override
    public AvailableSlotsResponse getAvailableSlots(String doctorId, LocalDate date, String consultationType) {
        validateBookingDate(date);

        int dayOfWeek = date.getDayOfWeek().getValue() % 7;

        List<DoctorSchedule> schedules = scheduleRepository
                .findByDoctor_DoctorIdAndDayOfWeekAndAvailableTrue(doctorId, dayOfWeek);

        LocalDateTime dayStart = date.atStartOfDay();
        LocalDateTime dayEnd = date.plusDays(1).atStartOfDay().minusSeconds(1);

        List<Appointment> bookedAppointments = appointmentRepository
                .findByDoctor_DoctorIdAndStatusNotAndAppointmentTimeBetween(
                        doctorId,
                        "Cancelled",
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

        for (DoctorSchedule schedule : schedules) {
            if (!isConsultationTypeMatch(schedule, consultationType)) {
                continue;
            }

            int slotMinutes = schedule.getSlotDuration() == null
                    ? 30
                    : schedule.getSlotDuration();

            LocalDateTime slotStart = LocalDateTime.of(date, schedule.getStartTime());
            LocalDateTime scheduleEnd = LocalDateTime.of(date, schedule.getEndTime());

            while (!slotStart.plusMinutes(slotMinutes).isAfter(scheduleEnd)) {
                LocalDateTime slotEnd = slotStart.plusMinutes(slotMinutes);
                LocalDateTime currentSlotStart = slotStart;

                boolean isBooked = bookedAppointments.stream()
                        .anyMatch(a -> a.getAppointmentTime().equals(currentSlotStart));

                boolean isHeld = activeHolds.stream()
                        .anyMatch(h -> h.getAppointmentTime().equals(currentSlotStart));

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

                slots.add(
                        AvailableSlotResponse.builder()
                                .startTime(slotStart.toLocalTime().toString())
                                .endTime(slotEnd.toLocalTime().toString())
                                .status(status)
                                .selectable(selectable)
                                .build()
                );

                slotStart = slotEnd;
            }

        }

        return AvailableSlotsResponse.builder()
                .doctorId(doctorId)
                .date(date)
                .bookingWindowDays(maxDaysAhead)
                .slots(slots)
                .build();
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

        Doctor doctor = doctorRepository.findById(request.getDoctorId())
                .orElseThrow(() -> new ResourceNotFoundException(
                "Doctor not found with ID: " + request.getDoctorId()
        ));

        Patient patient = patientRepository.findById(request.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException(
                "Patient not found with ID: " + request.getPatientId()
        ));

        LocalDateTime appointmentTime = request.getAppointmentTime();

        int dayOfWeek = appointmentTime.getDayOfWeek().getValue() % 7;
        LocalTime requestedTime = appointmentTime.toLocalTime();

        List<DoctorSchedule> schedulesOfDay = scheduleRepository
                .findByDoctor_DoctorIdAndDayOfWeekAndAvailableTrue(
                        doctor.getDoctorId(),
                        dayOfWeek
                );

        DoctorSchedule matchedSchedule = schedulesOfDay.stream()
                .filter(s -> isConsultationTypeMatch(s, request.getConsultationType()))
                .filter(s -> !requestedTime.isBefore(s.getStartTime())
                && requestedTime.isBefore(s.getEndTime()))
                .filter(s -> isAlignedWithSlot(s, requestedTime))
                .findFirst()
                .orElseThrow(() -> new BusinessException(
                "Doctor does not have a suitable working shift at this time"
        ));

        int slotMinutes = matchedSchedule.getSlotDuration() == null
                ? 30
                : matchedSchedule.getSlotDuration();

        LocalDateTime slotEnd = appointmentTime.plusMinutes(slotMinutes);

        boolean hasBookedConflict = appointmentRepository
                .existsByDoctor_DoctorIdAndStatusNotAndAppointmentTimeBetween(
                        doctor.getDoctorId(),
                        "Cancelled",
                        appointmentTime,
                        slotEnd.minusSeconds(1)
                );

        if (hasBookedConflict) {
            throw new BusinessException("This slot has already been booked");
        }

        LocalDateTime now = LocalDateTime.now();

        boolean hasActiveHold = appointmentSlotHoldRepository
                .existsByDoctor_DoctorIdAndAppointmentTimeAndExpiresAtAfter(
                        doctor.getDoctorId(),
                        appointmentTime,
                        now
                );

        if (hasActiveHold) {
            throw new BusinessException("This slot is currently being held by another patient");
        }

        AppointmentSlotHold hold = AppointmentSlotHold.builder()
                .doctor(doctor)
                .patient(patient)
                .appointmentTime(appointmentTime)
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
                "Hold not found with ID: " + holdId
        ));

        appointmentSlotHoldRepository.delete(hold);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------
    // Validate input data for the booking request.
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

    // Check if the doctor supports the requested consultation type.
    private void checkConsultationTypeSupported(Doctor doctor, String consultationType) {
        boolean supported = switch (consultationType.toLowerCase()) {
            case "video" ->
                doctor.isAvailableForVideo();
            case "audio" ->
                doctor.isAvailableForAudio();
            case "chat" ->
                doctor.isAvailableForChat();
            case "offline" ->
                doctor.isAvailableForOffline();
            default ->
                throw new BusinessException(
                        "Invalid consultation type: '" + consultationType
                        + "'. Must be: Video, Audio, Chat, Offline");
        };

        if (!supported) {
            throw new BusinessException(
                    "Doctor " + doctor.getFullName()
                    + " does not support consultation type: " + consultationType);
        }
    }

    // Checks if the schedule supports the requested consultation type. Null means all types are supported.
    private boolean isConsultationTypeMatch(DoctorSchedule schedule, String consultationType) {
        if (schedule.getConsultationType() == null || schedule.getConsultationType().isBlank()) {
            return true;
        }
        return schedule.getConsultationType().equalsIgnoreCase(consultationType);
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
        String title = "New appointment booked";
        String message = String.format(
                "%s booked a %s appointment at %s.",
                patientName,
                consultationType,
                appointmentTime
        );

        runAfterCommit("new appointment notification appointmentId=" + appointmentId, () -> {
            notificationService.sendWebSocketNotification(
                    doctorUser,
                    NotificationType.NEW_APPOINTMENT,
                    title,
                    message,
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
        String title = "Appointment cancelled";
        String message = String.format(
                "%s's appointment at %s was cancelled by %s. Reason: %s",
                patientName,
                appointmentTime,
                cancelledBy,
                cancelReason
        );

        runAfterCommit("cancel appointment notification appointmentId=" + appointmentId, () -> {
            notificationService.sendWebSocketNotification(
                    doctorUser,
                    NotificationType.CANCEL_APPOINTMENT,
                    title,
                    message,
                    appointmentId,
                    actionUrl
            );
            log.info("Cancel appointment notification queued for doctorUserId={}, appointmentId={}",
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

    /**
     * Converts an Appointment entity to a DTO response.
     */
    private AppointmentResponse toResponse(Appointment a) {
        return AppointmentResponse.builder()
                .appointmentId(a.getAppointmentId())
                .patientId(a.getPatient().getPatientId())
                .patientName(a.getPatient().getFullName())
                .doctorId(a.getDoctor().getDoctorId())
                .doctorName(a.getDoctor().getFullName())
                .appointmentTime(a.getAppointmentTime())
                .consultationType(a.getConsultationType())
                .status(a.getStatus())
                .fee(a.getFee())
                .symptoms(a.getSymptoms())
                .notes(a.getNotes())
                .cancelledAt(a.getCancelledAt())
                .cancelReason(a.getCancelReason())
                .cancelledBy(a.getCancelledBy())
                .confirmedAt(a.getConfirmedAt())
                .build();
    }

    private void validateBookingDate(LocalDate date) {
        LocalDate today = LocalDate.now();
        LocalDate latestAllowedDate = today.plusDays(maxDaysAhead);

        if (date.isBefore(today)) {
            throw new BusinessException("Cannot book appointments in the past");
        }

        if (date.isAfter(latestAllowedDate)) {
            throw new BusinessException(
                    "Appointments can only be booked within the next "
                    + maxDaysAhead
                    + " days"
            );
        }
    }

    private boolean isAlignedWithSlot(DoctorSchedule schedule, LocalTime requestedTime) {
        int minutesFromStart = (int) java.time.Duration
                .between(schedule.getStartTime(), requestedTime)
                .toMinutes();

        int slotMinutes = Objects.requireNonNullElse(
                schedule.getSlotDuration(),
                30
        );

        return minutesFromStart >= 0 && minutesFromStart % slotMinutes == 0;
    }

    /**
     * Returns the day name in English.
     */
    private String getDayName(int dayOfWeek) {
        String[] names = {"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"};
        return (dayOfWeek >= 0 && dayOfWeek < names.length) ? names[dayOfWeek] : "unknown";
    }
}
