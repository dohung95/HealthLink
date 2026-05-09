package com.HealthLink.service.appointment;

import com.HealthLink.dto.request.AppointmentRequest;
import com.HealthLink.dto.request.CancelAppointmentRequest;
import com.HealthLink.dto.request.RescheduleAppointmentRequest;
import com.HealthLink.dto.response.AppointmentResponse;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.DoctorSchedule;
import com.HealthLink.entity.Patient;
import com.HealthLink.exception.BusinessException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.repository.doctor.DoctorScheduleRepository;
import com.HealthLink.repository.patient.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final DoctorScheduleRepository scheduleRepository;

    // createAppointment
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
        int slotMinutes = matchedSchedule.getSlotDuration() != null
                ? matchedSchedule.getSlotDuration() : 30;

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

        return toResponse(appointmentRepository.save(appointment));
    }

    // get list of all appointment for a specific patient and return list of appointments sorted by the latest first
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
    public AppointmentResponse getAppointmentById(Integer id) {
        return toResponse(
                appointmentRepository.findById(id)
                        .orElseThrow(() -> new ResourceNotFoundException(
                        "Không tìm thấy lịch hẹn với ID: " + id)));
    }

    // Cancels appointment
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

        return toResponse(appointmentRepository.save(appointment));
    }

    // Dời lịch hẹn sang thời gian mới
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
        int slotMinutes = matchedSchedule.getSlotDuration() != null
                ? matchedSchedule.getSlotDuration() : 30;
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
