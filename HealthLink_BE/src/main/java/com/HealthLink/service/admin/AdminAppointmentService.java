package com.HealthLink.service.admin;

import com.HealthLink.dto.admin.*;
import com.HealthLink.entity.*;
import com.HealthLink.entity.enums.NotificationType;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.admin.AdminAppointmentRepository;
import com.HealthLink.repository.admin.AdminDoctorRepository;
import com.HealthLink.repository.admin.AdminScheduleAuditLogRepository;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.service.admin.AdminNotificationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class AdminAppointmentService {

    private final AdminAppointmentRepository appointmentRepository;
    private final AdminDoctorRepository doctorRepository;
    private final AdminScheduleAuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final AdminNotificationService adminNotificationService;

    public AdminAppointmentService(
            AdminAppointmentRepository appointmentRepository,
            AdminDoctorRepository doctorRepository,
            AdminScheduleAuditLogRepository auditLogRepository,
            UserRepository userRepository,
            AdminNotificationService adminNotificationService) {
        this.appointmentRepository = appointmentRepository;
        this.doctorRepository = doctorRepository;
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
        this.adminNotificationService = adminNotificationService;
    }

    public AdminAppointmentStatsDto getStats() {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now().atTime(LocalTime.MAX);

        return AdminAppointmentStatsDto.builder()
            .todayAppointments(appointmentRepository.countTodayAppointments(startOfDay, endOfDay))
            .pendingApproval(appointmentRepository.countPendingAppointments())
            .completed(appointmentRepository.countCompletedAppointments())
            .cancelled(appointmentRepository.countCancelledAppointments())
            .build();
    }

    public AdminAppointmentPageResponse getAppointments(int pageNumber, int pageSize, String searchTerm,
                                                         String date, String status, String department) {
        Pageable pageable = PageRequest.of(Math.max(pageNumber - 1, 0), Math.max(pageSize, 1),
            Sort.by(Sort.Direction.DESC, "appointmentTime"));
        Specification<Appointment> specification = buildSpecification(searchTerm, date, status, department);
        Page<Appointment> page = appointmentRepository.findAll(specification, pageable);

        List<AdminAppointmentDto> appointments = page.stream()
            .map(this::mapToDto)
            .collect(Collectors.toList());

        return new AdminAppointmentPageResponse(
            appointments,
            page.getNumber() + 1,
            page.getSize(),
            page.getTotalElements(),
            page.getTotalPages()
        );
    }

    public AdminAppointmentDto getAppointmentById(Integer appointmentId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
            .orElseThrow(() -> new ResourceNotFoundException("Appointment", "id", appointmentId));
        return mapToDto(appointment);
    }

    public AdminAppointmentDto updateAppointment(Integer appointmentId, AdminAppointmentUpdateDto updateDto) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
            .orElseThrow(() -> new ResourceNotFoundException("Appointment", "id", appointmentId));

        // Update appointment fields
        if (updateDto.getAppointmentTime() != null) {
            appointment.setAppointmentTime(updateDto.getAppointmentTime());
        }
        if (StringUtils.hasText(updateDto.getConsultationType())) {
            appointment.setConsultationType(updateDto.getConsultationType());
        }
        if (StringUtils.hasText(updateDto.getStatus())) {
            appointment.setStatus(updateDto.getStatus());
        }
        if (StringUtils.hasText(updateDto.getNotes())) {
            appointment.setNotes(updateDto.getNotes());
        }

        // Update related consultation if exists
        Consultation consultation = appointment.getConsultation();
        if (consultation != null) {
            if (updateDto.getFollowUpDate() != null) {
                consultation.setFollowUpDate(updateDto.getFollowUpDate());
            }
            if (StringUtils.hasText(updateDto.getDoctorNotes())) {
                consultation.setDoctorNotes(updateDto.getDoctorNotes());
            }
            if (StringUtils.hasText(updateDto.getDiagnosis())) {
                consultation.setDiagnosis(updateDto.getDiagnosis());
            }
        }

        Appointment savedAppointment = appointmentRepository.save(appointment);
        return mapToDto(savedAppointment);
    }

    private Specification<Appointment> buildSpecification(String searchTerm, String date, String status, String department) {
        return (root, query, cb) -> {
            var predicates = new ArrayList<jakarta.persistence.criteria.Predicate>();
            var patientJoin = root.join("patient", jakarta.persistence.criteria.JoinType.LEFT);
            var doctorJoin = root.join("doctor", jakarta.persistence.criteria.JoinType.LEFT);

            if (StringUtils.hasText(searchTerm)) {
                String term = "%" + searchTerm.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                    cb.like(cb.lower(patientJoin.get("fullName")), term),
                    cb.like(cb.lower(doctorJoin.get("fullName")), term),
                    cb.like(cb.toString(root.get("appointmentId")), "%" + searchTerm.trim() + "%")
                ));
            }

            if (StringUtils.hasText(date)) {
                try {
                    LocalDate filterDate = LocalDate.parse(date);
                    LocalDateTime startOfDay = filterDate.atStartOfDay();
                    LocalDateTime endOfDay = filterDate.atTime(LocalTime.MAX);
                    predicates.add(cb.between(root.get("appointmentTime"), startOfDay, endOfDay));
                } catch (Exception e) {
                    // Invalid date format, ignore filter
                }
            }

            if (StringUtils.hasText(status)) {
                predicates.add(cb.equal(cb.lower(root.get("status")), status.trim().toLowerCase()));
            }

            if (StringUtils.hasText(department)) {
                predicates.add(cb.equal(cb.lower(doctorJoin.get("specialty")), department.trim().toLowerCase()));
            }

            return predicates.isEmpty() ? cb.conjunction() : cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };
    }

    private AdminAppointmentDto mapToDto(Appointment appointment) {
        Patient patient = appointment.getPatient();
        Doctor doctor = appointment.getDoctor();
        Consultation consultation = appointment.getConsultation();

        // Format date and time for display
        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("MMM dd, yyyy");
        DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("hh:mm a");
        // Raw formats for HTML input elements
        DateTimeFormatter rawDateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        DateTimeFormatter rawTimeFormatter = DateTimeFormatter.ofPattern("HH:mm");

        String formattedDate = appointment.getAppointmentTime() != null
            ? appointment.getAppointmentTime().format(dateFormatter)
            : null;
        String formattedTime = appointment.getAppointmentTime() != null
            ? appointment.getAppointmentTime().format(timeFormatter)
            : null;
        String rawDate = appointment.getAppointmentTime() != null
            ? appointment.getAppointmentTime().format(rawDateFormatter)
            : null;
        String rawTime = appointment.getAppointmentTime() != null
            ? appointment.getAppointmentTime().format(rawTimeFormatter)
            : null;

        return AdminAppointmentDto.builder()
            .appointmentID(appointment.getAppointmentId())
            .date(formattedDate)
            .time(formattedTime)
            .rawDate(rawDate)
            .rawTime(rawTime)
            .appointmentTime(appointment.getAppointmentTime())
            .consultationType(appointment.getConsultationType())
            .status(appointment.getStatus())
            .symptoms(appointment.getSymptoms())
            .notes(appointment.getNotes())
            .fee(appointment.getFee())
            // Patient info
            .patientId(patient != null ? patient.getPatientId() : null)
            .patientName(patient != null ? patient.getFullName() : null)
            .patientEmail(patient != null && patient.getUser() != null ? patient.getUser().getEmail() : null)
            .patientPhone(patient != null && patient.getUser() != null ? patient.getUser().getPhoneNumber() : null)
            // Doctor info
            .doctorId(doctor != null ? doctor.getDoctorId() : null)
            .doctorName(doctor != null ? doctor.getFullName() : null)
            .doctorEmail(doctor != null && doctor.getUser() != null ? doctor.getUser().getEmail() : null)
            .department(doctor != null ? doctor.getSpecialty() : null)
            // Consultation info
            .consultationId(consultation != null ? consultation.getConsultationId() : null)
            .consultationStartTime(consultation != null ? consultation.getStartTime() : null)
            .consultationEndTime(consultation != null ? consultation.getEndTime() : null)
            .diagnosis(consultation != null ? consultation.getDiagnosis() : null)
            .doctorNotes(consultation != null ? consultation.getDoctorNotes() : null)
            .followUpDate(consultation != null ? consultation.getFollowUpDate() : null)
            .followUpAppointmentId(consultation != null ? consultation.getFollowUpAppointmentId() : null)
            .treatmentPlan(consultation != null ? consultation.getTreatmentPlan() : null)
            // Additional info
            .cancelReason(appointment.getCancelReason())
            .cancelledBy(appointment.getCancelledBy())
            .cancelledAt(appointment.getCancelledAt())
            .confirmedAt(appointment.getConfirmedAt())
            .createdAt(appointment.getAppointmentTime()) // Using appointmentTime as createdAt
            .build();
    }

    // ==================== Admin Reassign/Cancel Methods ====================

    /**
     * Admin chuyển appointment sang bác sĩ khác.
     */
    public AdminAppointmentDto reassignAppointment(
            AdminAppointmentReassignRequest request,
            String adminUserId,
            HttpServletRequest httpRequest) {

        Appointment appointment = appointmentRepository.findById(request.getAppointmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Appointment", "id", request.getAppointmentId()));

        // Validate appointment status
        if ("Cancelled".equalsIgnoreCase(appointment.getStatus()) ||
            "Completed".equalsIgnoreCase(appointment.getStatus())) {
            throw new BadRequestException("Cannot reassign a cancelled or completed appointment");
        }

        Doctor oldDoctor = appointment.getDoctor();
        Doctor newDoctor = doctorRepository.findById(request.getNewDoctorId())
                .orElseThrow(() -> new ResourceNotFoundException("New Doctor", "id", request.getNewDoctorId()));

        User adminUser = userRepository.findById(adminUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin User", "id", adminUserId));

        // Store old state for audit
        String oldState = appointmentToJson(appointment);

        // Update appointment
        appointment.setDoctor(newDoctor);
        if (request.getNewAppointmentTime() != null) {
            appointment.setAppointmentTime(request.getNewAppointmentTime());
        }

        Appointment savedAppointment = appointmentRepository.save(appointment);

        // Log audit
        logAdminAction(
                adminUser,
                "REASSIGN_APPOINTMENT",
                newDoctor.getDoctorId(),
                appointment.getAppointmentId(),
                appointment.getPatient() != null ? appointment.getPatient().getPatientId() : null,
                String.format("Reassigned appointment #%d from Dr. %s to Dr. %s",
                        appointment.getAppointmentId(),
                        oldDoctor != null ? oldDoctor.getFullName() : "Unknown",
                        newDoctor.getFullName()),
                oldState,
                appointmentToJson(savedAppointment),
                request.getReason(),
                getClientIp(httpRequest)
        );

        // Send notifications (using Admin notification system)
        if (request.isNotifyPatient() && appointment.getPatient() != null && appointment.getPatient().getUser() != null) {
            adminNotificationService.sendMobilePushNotification(
                    appointment.getPatient().getUser().getId(),
                    NotificationType.ADMIN_APPOINTMENT_REASSIGN,
                    "Thay đổi bác sĩ khám",
                    String.format("Lịch hẹn của bạn đã được chuyển sang bác sĩ %s. Lý do: %s",
                            newDoctor.getFullName(), request.getReason()),
                    appointment.getAppointmentId()
            );
        }

        if (request.isNotifyOldDoctor() && oldDoctor != null && oldDoctor.getUser() != null) {
            adminNotificationService.sendWebSocketNotification(
                    oldDoctor.getUser().getId(),
                    NotificationType.ADMIN_APPOINTMENT_REASSIGN,
                    "Lịch hẹn được chuyển",
                    String.format("Lịch hẹn #%d đã được Admin chuyển sang bác sĩ khác. Lý do: %s",
                            appointment.getAppointmentId(), request.getReason()),
                    appointment.getAppointmentId()
            );
        }

        if (request.isNotifyNewDoctor() && newDoctor.getUser() != null) {
            adminNotificationService.sendWebSocketNotification(
                    newDoctor.getUser().getId(),
                    NotificationType.ADMIN_APPOINTMENT_REASSIGN,
                    "Lịch hẹn mới được chuyển đến",
                    String.format("Bạn nhận được lịch hẹn #%d từ Admin. Bệnh nhân: %s",
                            appointment.getAppointmentId(),
                            appointment.getPatient() != null ? appointment.getPatient().getFullName() : "Unknown"),
                    appointment.getAppointmentId()
            );
        }

        return mapToDto(savedAppointment);
    }

    /**
     * Admin hủy appointment.
     */
    public AdminAppointmentDto cancelAppointment(
            AdminAppointmentCancelRequest request,
            String adminUserId,
            HttpServletRequest httpRequest) {

        Appointment appointment = appointmentRepository.findById(request.getAppointmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Appointment", "id", request.getAppointmentId()));

        // Validate appointment status
        if ("Cancelled".equalsIgnoreCase(appointment.getStatus())) {
            throw new BadRequestException("Appointment is already cancelled");
        }
        if ("Completed".equalsIgnoreCase(appointment.getStatus())) {
            throw new BadRequestException("Cannot cancel a completed appointment");
        }

        User adminUser = userRepository.findById(adminUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin User", "id", adminUserId));

        // Store old state for audit
        String oldState = appointmentToJson(appointment);

        // Update appointment
        appointment.setStatus("Cancelled");
        appointment.setCancelReason("[Admin] " + request.getReason());
        appointment.setCancelledBy("Admin");
        appointment.setCancelledAt(LocalDateTime.now());

        Appointment savedAppointment = appointmentRepository.save(appointment);

        // Log audit
        logAdminAction(
                adminUser,
                "CANCEL_APPOINTMENT",
                appointment.getDoctor() != null ? appointment.getDoctor().getDoctorId() : null,
                appointment.getAppointmentId(),
                appointment.getPatient() != null ? appointment.getPatient().getPatientId() : null,
                String.format("Cancelled appointment #%d", appointment.getAppointmentId()),
                oldState,
                appointmentToJson(savedAppointment),
                request.getReason(),
                getClientIp(httpRequest)
        );

        // Send notifications (using Admin notification system)
        if (request.isNotifyPatient() && appointment.getPatient() != null && appointment.getPatient().getUser() != null) {
            adminNotificationService.sendMobilePushNotification(
                    appointment.getPatient().getUser().getId(),
                    NotificationType.ADMIN_APPOINTMENT_CANCEL,
                    "Lịch hẹn bị hủy",
                    String.format("Lịch hẹn của bạn vào %s đã bị Admin hủy. Lý do: %s",
                            appointment.getAppointmentTime() != null ?
                                    appointment.getAppointmentTime().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")) : "",
                            request.getReason()),
                    appointment.getAppointmentId()
            );
        }

        if (request.isNotifyDoctor() && appointment.getDoctor() != null && appointment.getDoctor().getUser() != null) {
            adminNotificationService.sendWebSocketNotification(
                    appointment.getDoctor().getUser().getId(),
                    NotificationType.ADMIN_APPOINTMENT_CANCEL,
                    "Lịch hẹn bị hủy bởi Admin",
                    String.format("Lịch hẹn #%d với bệnh nhân %s đã bị Admin hủy. Lý do: %s",
                            appointment.getAppointmentId(),
                            appointment.getPatient() != null ? appointment.getPatient().getFullName() : "Unknown",
                            request.getReason()),
                    appointment.getAppointmentId()
            );
        }

        // TODO: Process refund if needed (request.isProcessRefund())

        return mapToDto(savedAppointment);
    }

    // ==================== Private Helper Methods ====================

    private void logAdminAction(
            User adminUser,
            String actionType,
            String targetDoctorId,
            Integer targetAppointmentId,
            String targetPatientId,
            String description,
            String oldValue,
            String newValue,
            String reason,
            String ipAddress) {

        AdminScheduleAuditLog log = AdminScheduleAuditLog.builder()
                .adminUser(adminUser)
                .actionType(actionType)
                .targetDoctorId(targetDoctorId)
                .targetAppointmentId(targetAppointmentId)
                .targetPatientId(targetPatientId)
                .description(description)
                .oldValue(oldValue)
                .newValue(newValue)
                .reason(reason)
                .ipAddress(ipAddress)
                .createdAt(LocalDateTime.now())
                .build();

        auditLogRepository.save(log);
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private String appointmentToJson(Appointment a) {
        return String.format(
                "{\"appointmentId\":%d,\"doctorId\":\"%s\",\"patientId\":\"%s\",\"status\":\"%s\",\"appointmentTime\":\"%s\"}",
                a.getAppointmentId(),
                a.getDoctor() != null ? a.getDoctor().getDoctorId() : "",
                a.getPatient() != null ? a.getPatient().getPatientId() : "",
                a.getStatus(),
                a.getAppointmentTime()
        );
    }
}
