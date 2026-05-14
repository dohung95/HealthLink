package com.HealthLink.service.impl.appointment;

import com.HealthLink.dto.request.AppointmentRequest;
import com.HealthLink.dto.request.CancelAppointmentRequest;
import com.HealthLink.dto.request.RescheduleAppointmentRequest;
import com.HealthLink.dto.response.AppointmentResponse;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.DoctorSchedule;
import com.HealthLink.entity.Patient;
import com.HealthLink.entity.User;
import com.HealthLink.entity.enums.NotificationType;
import com.HealthLink.exception.BusinessException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.repository.doctor.DoctorScheduleRepository;
import com.HealthLink.repository.patient.PatientRepository;
import com.HealthLink.service.appointment.AppointmentService;
import com.HealthLink.service.notification.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AppointmentServiceImpl implements AppointmentService{

    private static final DateTimeFormatter NOTIFICATION_TIME_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final DoctorScheduleRepository scheduleRepository;
    private final NotificationService notificationService;

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

        Appointment saved = appointmentRepository.save(appointment);
        notifyDoctorAboutNewAppointmentAfterCommit(saved);

        return toResponse(saved);
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

    /**
     * Returns the day name in English.
     */
    private String getDayName(int dayOfWeek) {
        String[] names = {"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"};
        return (dayOfWeek >= 0 && dayOfWeek < names.length) ? names[dayOfWeek] : "unknown";
    }
}
