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
import com.HealthLink.service.payment.FinanceService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
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
    private final FinanceService financeService;

    public AdminAppointmentService(
            AdminAppointmentRepository appointmentRepository,
            AdminDoctorRepository doctorRepository,
            AdminScheduleAuditLogRepository auditLogRepository,
            UserRepository userRepository,
            AdminNotificationService adminNotificationService,
            FinanceService financeService) {
        this.appointmentRepository = appointmentRepository;
        this.doctorRepository = doctorRepository;
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
        this.adminNotificationService = adminNotificationService;
        this.financeService = financeService;
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
                                                         String date, String startDate, String endDate,
                                                         String status, String department) {
        Pageable pageable = PageRequest.of(Math.max(pageNumber - 1, 0), Math.max(pageSize, 1),
            Sort.by(Sort.Direction.DESC, "appointmentTime"));
        Specification<Appointment> specification = buildSpecification(
                searchTerm, date, startDate, endDate, status, department);
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

    private Specification<Appointment> buildSpecification(String searchTerm, String date,
                                                            String startDate, String endDate,
                                                            String status, String department) {
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

            // Ưu tiên khoảng ngày (startDate/endDate, dùng cho calendar theo tháng) nếu có,
            // nếu không mới xét lọc theo đúng 1 ngày (date, dùng cho filter list view)
            if (StringUtils.hasText(startDate) || StringUtils.hasText(endDate)) {
                try {
                    LocalDateTime rangeStart = StringUtils.hasText(startDate)
                            ? LocalDate.parse(startDate).atStartOfDay()
                            : null;
                    LocalDateTime rangeEnd = StringUtils.hasText(endDate)
                            ? LocalDate.parse(endDate).atTime(LocalTime.MAX)
                            : null;

                    if (rangeStart != null && rangeEnd != null) {
                        predicates.add(cb.between(root.get("appointmentTime"), rangeStart, rangeEnd));
                    } else if (rangeStart != null) {
                        predicates.add(cb.greaterThanOrEqualTo(root.get("appointmentTime"), rangeStart));
                    } else {
                        predicates.add(cb.lessThanOrEqualTo(root.get("appointmentTime"), rangeEnd));
                    }
                } catch (Exception e) {
                    // Invalid date format, ignore filter
                }
            } else if (StringUtils.hasText(date)) {
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
            .doctorSelectionMode(appointment.getDoctorSelectionMode())
            .status(appointment.getStatus())
            .symptoms(appointment.getSymptoms())
            .notes(appointment.getNotes())
            .fee(appointment.getFee())
            // Patient info
            .patientId(patient != null ? patient.getPatientId() : null)
            .patientName(patient != null ? patient.getFullName() : null)
            .patientEmail(patient != null && patient.getUser() != null ? patient.getUser().getEmail() : null)
            .patientPhone(patient != null && patient.getUser() != null ? patient.getUser().getPhoneNumber() : null)
            .patientAvatarUrl(patient != null ? patient.getAvatarUrl() : null)
            // Doctor info
            .doctorId(doctor != null ? doctor.getDoctorId() : null)
            .doctorName(doctor != null ? doctor.getFullName() : null)
            .doctorEmail(doctor != null && doctor.getUser() != null ? doctor.getUser().getEmail() : null)
            .department(doctor != null ? doctor.getSpecialty() : null)
            .doctorAvatarUrl(doctor != null ? doctor.getAvatarUrl() : null)
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
     * Admin transfers an appointment to another doctor.
     */
    public AdminAppointmentDto reassignAppointment(
            AdminAppointmentReassignRequest request,
            String adminUserId,
            HttpServletRequest httpRequest) {

        Appointment appointment = appointmentRepository.findById(request.getAppointmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Appointment", "id", request.getAppointmentId()));

        // Validate appointment status
        if ("CANCELLED".equalsIgnoreCase(appointment.getStatus()) ||
            "COMPLETED".equalsIgnoreCase(appointment.getStatus())) {
            throw new BadRequestException("Cannot reassign a cancelled or completed appointment");
        }

        // Home Visit appointments or appointments where the patient manually picked their doctor
        // (and paid an extra fee for it) cannot be reassigned directly - they must be cancelled
        // with a refund so the patient can rebook themselves (see cancelDueToDoctorUnavailable).
        if (isForcedCancelAppointment(appointment)) {
            throw new BadRequestException(
                    "Home Visit appointments or appointments with a manually-selected doctor cannot be reassigned directly. " +
                    "Please use the 'Cancel & Refund' action instead so the patient can rebook.");
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
        if (request.isNotifyPatient() && appointment.getPatient() != null) {
            User patientUser = appointment.getPatient().getUser();
            if (patientUser == null) {
                patientUser = userRepository.findById(appointment.getPatient().getPatientId()).orElse(null);
            }
            if (patientUser != null) {
                adminNotificationService.sendMobilePushNotification(
                        patientUser.getId(),
                        NotificationType.ADMIN_APPOINTMENT_REASSIGN,
                        "Appointment Reassigned",
                        String.format("Your appointment has been reassigned to Dr. %s. Reason: %s",
                                newDoctor.getFullName(), request.getReason()),
                        appointment.getAppointmentId()
                );
            }
        }

        if (request.isNotifyOldDoctor() && oldDoctor != null) {
            User oldDoctorUser = oldDoctor.getUser();
            if (oldDoctorUser == null) {
                oldDoctorUser = userRepository.findById(oldDoctor.getDoctorId()).orElse(null);
            }
            if (oldDoctorUser != null) {
                adminNotificationService.sendWebSocketNotification(
                        oldDoctorUser.getId(),
                        NotificationType.ADMIN_APPOINTMENT_REASSIGN,
                        "Appointment Transferred",
                        String.format("Appointment #%d has been reassigned to another doctor by Admin. Reason: %s",
                                appointment.getAppointmentId(), request.getReason()),
                        appointment.getAppointmentId()
                );
            }
        }

        if (request.isNotifyNewDoctor()) {
            User newDoctorUser = newDoctor.getUser();
            if (newDoctorUser == null) {
                newDoctorUser = userRepository.findById(newDoctor.getDoctorId()).orElse(null);
            }
            if (newDoctorUser != null) {
                adminNotificationService.sendWebSocketNotification(
                        newDoctorUser.getId(),
                        NotificationType.ADMIN_APPOINTMENT_REASSIGN,
                        "New Appointment Assigned",
                        String.format("You have been assigned appointment #%d by Admin. Patient: %s",
                                appointment.getAppointmentId(),
                                appointment.getPatient() != null ? appointment.getPatient().getFullName() : "Unknown"),
                        appointment.getAppointmentId()
                );
            }
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
        if ("CANCELLED".equalsIgnoreCase(appointment.getStatus())) {
            throw new BadRequestException("Appointment is already cancelled");
        }
        if ("COMPLETED".equalsIgnoreCase(appointment.getStatus())) {
            throw new BadRequestException("Cannot cancel a completed appointment");
        }

        User adminUser = userRepository.findById(adminUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin User", "id", adminUserId));

        // Store old state for audit
        String oldState = appointmentToJson(appointment);

        // Update appointment
        appointment.setStatus("CANCELLED");
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
                    "Appointment Cancelled",
                    String.format("Your appointment on %s has been cancelled by Admin. Reason: %s",
                            appointment.getAppointmentTime() != null ?
                                    appointment.getAppointmentTime().format(DateTimeFormatter.ofPattern("MMM dd, yyyy HH:mm")) : "",
                            request.getReason()),
                    appointment.getAppointmentId()
            );
        }

        if (request.isNotifyDoctor() && appointment.getDoctor() != null && appointment.getDoctor().getUser() != null) {
            adminNotificationService.sendWebSocketNotification(
                    appointment.getDoctor().getUser().getId(),
                    NotificationType.ADMIN_APPOINTMENT_CANCEL,
                    "Appointment Cancelled by Admin",
                    String.format("Appointment #%d with patient %s has been cancelled by Admin. Reason: %s",
                            appointment.getAppointmentId(),
                            appointment.getPatient() != null ? appointment.getPatient().getFullName() : "Unknown",
                            request.getReason()),
                    appointment.getAppointmentId()
            );
        }

        // TODO: Process refund if needed (request.isProcessRefund())

        return mapToDto(savedAppointment);
    }

    /**
     * Cancels an appointment because the assigned doctor cannot perform it (sudden unavailability,
     * or admin could not find a suitable replacement), and automatically refunds 100% of the payment
     * to the patient. Used for Home Visit appointments or appointments where the patient manually
     * selected their doctor (MANUAL_SELECTED) - cases where the doctor cannot be reassigned directly
     * (see the guard in reassignAppointment). The patient is notified with a link to rebook.
     */
    public AdminAppointmentDto cancelDueToDoctorUnavailable(
            Integer appointmentId,
            String reason,
            String adminUserId,
            HttpServletRequest httpRequest) {

        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment", "id", appointmentId));

        if ("CANCELLED".equalsIgnoreCase(appointment.getStatus())) {
            throw new BadRequestException("Appointment is already cancelled");
        }
        if ("COMPLETED".equalsIgnoreCase(appointment.getStatus())) {
            throw new BadRequestException("Cannot cancel a completed appointment");
        }

        User adminUser = userRepository.findById(adminUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin User", "id", adminUserId));

        String oldState = appointmentToJson(appointment);

        appointment.setStatus("CANCELLED");
        appointment.setCancelReason("[System] Doctor unavailable: " + reason);
        appointment.setCancelledBy("Admin");
        appointment.setCancelledAt(LocalDateTime.now());

        Appointment savedAppointment = appointmentRepository.save(appointment);

        logAdminAction(
                adminUser,
                "CANCEL_APPOINTMENT_DOCTOR_UNAVAILABLE",
                appointment.getDoctor() != null ? appointment.getDoctor().getDoctorId() : null,
                appointment.getAppointmentId(),
                appointment.getPatient() != null ? appointment.getPatient().getPatientId() : null,
                String.format("Cancelled appointment #%d - doctor unavailable, auto refund", appointment.getAppointmentId()),
                oldState,
                appointmentToJson(savedAppointment),
                reason,
                getClientIp(httpRequest)
        );

        // Automatically refund if the appointment has a successful payment
        boolean refunded = false;
        Invoice invoice = appointment.getInvoice();
        if (invoice != null && invoice.getPayments() != null) {
            Payment successPayment = invoice.getPayments().stream()
                    .filter(p -> "SUCCESS".equalsIgnoreCase(p.getStatus()))
                    .findFirst()
                    .orElse(null);
            if (successPayment != null) {
                financeService.processRefund(successPayment.getPaymentId(), reason);
                refunded = true;
            }
        }

        String rebookUrl = buildRebookActionUrl(appointment);

        if (appointment.getPatient() != null && appointment.getPatient().getUser() != null) {
            String refundNote = refunded
                    ? " Your payment has been automatically refunded."
                    : "";
            adminNotificationService.sendMobilePushNotification(
                    appointment.getPatient().getUser().getId(),
                    NotificationType.ADMIN_APPOINTMENT_CANCEL,
                    "Appointment Cancelled",
                    String.format("Your appointment on %s has been cancelled because the doctor is unavailable. Reason: %s.%s Please book a new appointment.",
                            appointment.getAppointmentTime() != null
                                    ? appointment.getAppointmentTime().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))
                                    : "",
                            reason,
                            refundNote),
                    appointment.getAppointmentId(),
                    rebookUrl
            );
        }

        if (appointment.getDoctor() != null && appointment.getDoctor().getUser() != null) {
            adminNotificationService.sendWebSocketNotification(
                    appointment.getDoctor().getUser().getId(),
                    NotificationType.ADMIN_APPOINTMENT_CANCEL,
                    "Appointment Cancelled by Admin",
                    String.format("Appointment #%d has been cancelled because you are unavailable. Reason: %s",
                            appointment.getAppointmentId(), reason),
                    appointment.getAppointmentId()
            );
        }

        return mapToDto(savedAppointment);
    }

    // ==================== Private Helper Methods ====================

    private boolean isForcedCancelAppointment(Appointment appointment) {
        return "HomeVisit".equalsIgnoreCase(appointment.getConsultationType())
                || "MANUAL_SELECTED".equalsIgnoreCase(appointment.getDoctorSelectionMode());
    }

    private String buildRebookActionUrl(Appointment appointment) {
        String specialty = appointment.getDoctor() != null ? appointment.getDoctor().getSpecialty() : null;
        StringBuilder url = new StringBuilder("/schedule?rebook=1");
        if (StringUtils.hasText(specialty)) {
            url.append("&specialty=").append(URLEncoder.encode(specialty, StandardCharsets.UTF_8));
        }
        if (StringUtils.hasText(appointment.getConsultationType())) {
            url.append("&consultationType=").append(URLEncoder.encode(appointment.getConsultationType(), StandardCharsets.UTF_8));
        }
        return url.toString();
    }

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
