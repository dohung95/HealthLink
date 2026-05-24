package com.HealthLink.service.impl.appointment;

import com.HealthLink.dto.request.AppointmentRequest;
import com.HealthLink.dto.request.CancelAppointmentRequest;
import com.HealthLink.dto.request.HoldSlotRequest;
import com.HealthLink.dto.request.RescheduleAppointmentRequest;
import com.HealthLink.dto.response.AppointmentResponse;
import com.HealthLink.dto.response.AvailableSlotResponse;
import com.HealthLink.dto.response.AvailableSlotsResponse;
import com.HealthLink.dto.response.HoldSlotResponse;
import com.HealthLink.dto.response.PagedResponse;
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
    private static final String STATUS_PENDING_PAYMENT = "PENDINGPAYMENT";

    private static final DateTimeFormatter NOTIFICATION_TIME_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final DoctorScheduleRepository scheduleRepository;
    private final AppointmentSlotHoldRepository appointmentSlotHoldRepository;
    private final NotificationService notificationService;

    @Value("${booking.max-days-ahead}")
    private Integer maxDaysAhead;

    @Value("${booking.slot-hold-minutes}")
    private Integer slotHoldMinutes;

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

        checkConsultationTypeSupported(doctor, request.getConsultationType());

        LocalDateTime appointmentTime = request.getAppointmentTime();
        int dayOfWeek = appointmentTime.getDayOfWeek().getValue() % 7;
        LocalTime requestedTime = appointmentTime.toLocalTime();

        List<DoctorSchedule> schedulesOfDay = scheduleRepository
                .findByDoctor_DoctorIdAndDayOfWeekAndAvailableTrue(doctor.getDoctorId(), dayOfWeek);

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

        boolean hasConflict = appointmentRepository
                .existsByDoctor_DoctorIdAndStatusNotAndAppointmentTimeBetween(
                        doctor.getDoctorId(),
                        STATUS_CANCELLED,
                        slotStart,
                        slotEnd.minusSeconds(1)
                );

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

        Appointment appointment = Appointment.builder()
                .patient(patient)
                .doctor(doctor)
                .appointmentTime(appointmentTime)
                .endTime(appointmentTime.plusMinutes(slotMinutes))
                .consultationType(request.getConsultationType())
                .status(STATUS_PENDING_PAYMENT)
                .symptoms(request.getSymptoms())
                .notes(request.getNotes())
                .fee(doctor.getConsultationFee())
                .build();

        Appointment saved = appointmentRepository.save(appointment);

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

        int dayOfWeek = date.getDayOfWeek().getValue() % 7;

        List<DoctorSchedule> schedules = scheduleRepository
                .findByDoctor_DoctorIdAndDayOfWeekAndAvailableTrue(doctorId, dayOfWeek);

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
                LocalDateTime currentSlotStart = slotStart;
                LocalDateTime currentSlotEnd = slotStart.plusMinutes(slotMinutes);

                boolean isBooked = bookedAppointments.stream()
                        .anyMatch(appointment -> appointment.getAppointmentTime().equals(currentSlotStart));

                boolean isHeld = activeHolds.stream()
                        .anyMatch(hold -> hold.getAppointmentTime().equals(currentSlotStart));

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
                        "Doctor not found with ID: " + request.getDoctorId()));

        Patient patient = patientRepository.findById(request.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Patient not found with ID: " + request.getPatientId()));

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
                        "Doctor does not have a suitable working shift at this time"));

        int slotMinutes = Objects.requireNonNullElse(matchedSchedule.getSlotDuration(), 30);
        LocalDateTime slotEnd = appointmentTime.plusMinutes(slotMinutes);

        boolean hasBookedConflict = appointmentRepository
                .existsByDoctor_DoctorIdAndStatusNotAndAppointmentTimeBetween(
                        doctor.getDoctorId(),
                        STATUS_CANCELLED,
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
    public PagedResponse<AppointmentResponse> getPatientAppointmentsPaged(String patientId, int page, int size) {
        patientRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "not found patient with ID: " + patientId));

        int safePage = Math.max(page, 1);
        int safeSize = Math.min(Math.max(size, 1), 50);

        Page<Appointment> appointmentPage = appointmentRepository.findPatientAppointmentsOrdered(
                patientId,
                LocalDateTime.now(),
                PageRequest.of(safePage - 1, safeSize)
        );

        return PagedResponse.<AppointmentResponse>builder()
                .items(appointmentPage.getContent().stream()
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
                .filter(appointment -> !STATUS_PENDING_PAYMENT.equalsIgnoreCase(appointment.getStatus()))
                .map(this::toResponse)
                .collect(Collectors.toList());
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
        if (appointment.getAppointmentTime().isBefore(LocalDateTime.now().plusHours(2))) {
            throw new BusinessException(
                    "Cannot cancel an appointment less than 2 hours before the scheduled time");
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

        boolean hasConflict = appointmentRepository
                .existsByDoctor_DoctorIdAndStatusNotAndAppointmentTimeBetweenAndAppointmentIdNot(
                        doctor.getDoctorId(),
                        STATUS_CANCELLED,
                        slotStart,
                        slotEnd.minusSeconds(1),
                        id
                );

        if (hasConflict) {
            throw new BusinessException(
                    "Doctor already has another appointment in this time slot (" + slotMinutes + " mins/slot)");
        }

        appointment.setRescheduledFrom(appointment.getAppointmentId());
        appointment.setAppointmentTime(newTime);
        appointment.setEndTime(newTime.plusMinutes(slotMinutes));

        return toResponse(appointmentRepository.save(appointment));
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

    private void checkConsultationTypeSupported(Doctor doctor, String consultationType) {
        boolean supported = switch (consultationType.toLowerCase()) {
            case "video" -> doctor.isAvailableForVideo();
            case "audio" -> doctor.isAvailableForAudio();
            case "chat" -> doctor.isAvailableForChat();
            case "offline" -> doctor.isAvailableForOffline();
            default -> throw new BusinessException(
                    "Invalid consultation type: '" + consultationType
                            + "'. Must be: Video, Audio, Chat, Offline");
        };

        if (!supported) {
            throw new BusinessException(
                    "Doctor " + doctor.getFullName()
                            + " does not support consultation type: " + consultationType);
        }
    }

    private boolean isConsultationTypeMatch(DoctorSchedule schedule, String consultationType) {
        if (schedule.getConsultationType() == null || schedule.getConsultationType().isBlank()) {
            return true;
        }
        return schedule.getConsultationType().equalsIgnoreCase(consultationType);
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
        return AppointmentResponse.builder()
                .appointmentId(appointment.getAppointmentId())
                .patientId(appointment.getPatient().getPatientId())
                .patientName(appointment.getPatient().getFullName())
                .doctorId(appointment.getDoctor().getDoctorId())
                .doctorName(appointment.getDoctor().getFullName())
                .appointmentTime(appointment.getAppointmentTime())
                .consultationType(appointment.getConsultationType())
                .status(appointment.getStatus())
                .fee(appointment.getFee())
                .symptoms(appointment.getSymptoms())
                .notes(appointment.getNotes())
                .cancelledAt(appointment.getCancelledAt())
                .cancelReason(appointment.getCancelReason())
                .cancelledBy(appointment.getCancelledBy())
                .confirmedAt(appointment.getConfirmedAt())
                .specialtyName(resolveSpecialtyName(appointment.getDoctor()))
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
}
