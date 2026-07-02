package com.HealthLink.service.impl.doctor;

import com.HealthLink.dto.doctor.schedule.DoctorScheduleChangeRequestRequest;
import com.HealthLink.dto.doctor.schedule.DoctorScheduleChangeRequestResponse;
import com.HealthLink.entity.Appointment;
import com.HealthLink.entity.Doctor;
import com.HealthLink.entity.DoctorScheduleChangeRequest;
import com.HealthLink.entity.enums.ChangeRequestStatus;
import com.HealthLink.entity.AdminScheduleAuditLog;
import com.HealthLink.repository.admin.AdminScheduleAuditLogRepository;
import com.HealthLink.repository.admin.DoctorScheduleChangeRequestRepository;
import com.HealthLink.repository.appointment.AppointmentRepository;
import com.HealthLink.entity.enums.NotificationType;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.service.admin.AdminNotificationService;
import com.HealthLink.service.doctor.DoctorScheduleChangeRequestService;
import com.HealthLink.service.notification.NotificationService;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class DoctorScheduleChangeRequestServiceImpl implements DoctorScheduleChangeRequestService {

    private final DoctorRepository doctorRepository;
    private final AppointmentRepository appointmentRepository;
    private final DoctorScheduleChangeRequestRepository changeRequestRepository;
    private final AdminScheduleAuditLogRepository auditLogRepository;
    private final NotificationService notificationService;
    private final AdminNotificationService adminNotificationService;

    public DoctorScheduleChangeRequestServiceImpl(DoctorRepository doctorRepository,
                                                  AppointmentRepository appointmentRepository,
                                                  DoctorScheduleChangeRequestRepository changeRequestRepository,
                                                  AdminScheduleAuditLogRepository auditLogRepository,
                                                  NotificationService notificationService,
                                                  AdminNotificationService adminNotificationService) {
        this.doctorRepository = doctorRepository;
        this.appointmentRepository = appointmentRepository;
        this.changeRequestRepository = changeRequestRepository;
        this.auditLogRepository = auditLogRepository;
        this.notificationService = notificationService;
        this.adminNotificationService = adminNotificationService;
    }

    @Override
    public DoctorScheduleChangeRequestResponse createChangeRequest(String doctorId,
                                                                   DoctorScheduleChangeRequestRequest request) {
        Doctor doctor = doctorRepository.findByIdWithUser(doctorId)
                .orElseThrow(() -> new IllegalStateException("Doctor not found: " + doctorId));

        Appointment appointment = appointmentRepository.findById(request.getAppointmentId())
                .orElseThrow(() -> new IllegalStateException("Appointment not found: " + request.getAppointmentId()));

        if (!appointment.getDoctor().getDoctorId().equals(doctorId)) {
            throw new IllegalStateException("Appointment does not belong to this doctor.");
        }

        if (appointment.getAppointmentTime().isBefore(LocalDateTime.now())) {
            throw new IllegalStateException("Only future appointments may request a schedule change.");
        }

        boolean existingPending = changeRequestRepository.existsByAppointmentAndStatus(appointment, ChangeRequestStatus.PENDING);
        if (existingPending) {
            throw new IllegalStateException("A pending change request already exists for this appointment.");
        }

        DoctorScheduleChangeRequest entity = DoctorScheduleChangeRequest.builder()
                .doctor(doctor)
                .appointment(appointment)
                .status(ChangeRequestStatus.PENDING)
                .reason(request.getReason())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        DoctorScheduleChangeRequest saved = changeRequestRepository.save(entity);
        logDoctorScheduleChangeRequest(doctor, appointment, saved, "REQUEST_CREATED");
        notifyDoctorRequestCreated(doctor, saved);
        adminNotificationService.notifyDoctorScheduleChangeRequest(
                doctor.getFullName(), appointment.getAppointmentId(), saved.getRequestId());
        return mapResponse(saved);
    }

    @Override
    public List<DoctorScheduleChangeRequestResponse> getMyChangeRequests(String doctorId) {
        return changeRequestRepository.findByDoctorDoctorIdOrderByCreatedAtDesc(doctorId).stream()
                .map(this::mapResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<DoctorScheduleChangeRequestResponse> getAllChangeRequests() {
        return changeRequestRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapResponse)
                .collect(Collectors.toList());
    }

    @Override
    public DoctorScheduleChangeRequestResponse approveChangeRequest(Integer requestId,
                                                                     String adminId,
                                                                     String adminReason) {
        DoctorScheduleChangeRequest request = loadRequest(requestId);
        request.setStatus(ChangeRequestStatus.APPROVED);
        request.setAdminReason(adminReason);
        request.setHandledBy(adminId);
        request.setUpdatedAt(LocalDateTime.now());
        DoctorScheduleChangeRequest saved = changeRequestRepository.save(request);
        logDoctorScheduleChangeRequest(request.getDoctor(), request.getAppointment(), saved, "REQUEST_APPROVED");
        notifyDoctorRequestResult(request.getDoctor(), saved);
        return mapResponse(saved);
    }

    @Override
    public DoctorScheduleChangeRequestResponse rejectChangeRequest(Integer requestId,
                                                                    String adminId,
                                                                    String adminReason) {
        DoctorScheduleChangeRequest request = loadRequest(requestId);
        request.setStatus(ChangeRequestStatus.REJECTED);
        request.setAdminReason(adminReason);
        request.setHandledBy(adminId);
        request.setUpdatedAt(LocalDateTime.now());
        DoctorScheduleChangeRequest saved = changeRequestRepository.save(request);
        logDoctorScheduleChangeRequest(request.getDoctor(), request.getAppointment(), saved, "REQUEST_REJECTED");
        notifyDoctorRequestResult(request.getDoctor(), saved);
        return mapResponse(saved);
    }

    private DoctorScheduleChangeRequest loadRequest(Integer requestId) {
        return changeRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalStateException("Change request not found: " + requestId));
    }

    private DoctorScheduleChangeRequestResponse mapResponse(DoctorScheduleChangeRequest request) {
        String patientName = request.getAppointment().getPatient() != null
                ? request.getAppointment().getPatient().getFullName()
                : null;
        return DoctorScheduleChangeRequestResponse.builder()
                .requestId(request.getRequestId())
                .appointmentId(request.getAppointment().getAppointmentId())
                .appointmentTime(request.getAppointment().getAppointmentTime())
                .patientName(patientName)
                .doctorId(request.getDoctor().getDoctorId())
                .doctorName(request.getDoctor().getFullName())
                .status(request.getStatus())
                .reason(request.getReason())
                .adminReason(request.getAdminReason())
                .handledBy(request.getHandledBy())
                .createdAt(request.getCreatedAt())
                .updatedAt(request.getUpdatedAt())
                .build();
    }

    private void notifyDoctorRequestCreated(Doctor doctor, DoctorScheduleChangeRequest request) {
        notificationService.sendWebSocketNotification(
                doctor.getUser(),
                NotificationType.ADMIN_SCHEDULE_CHANGE,
                "Schedule change request sent",
                "Your schedule change request for appointment #" + request.getAppointment().getAppointmentId() + " has been sent to the admin.",
                request.getAppointment().getAppointmentId(),
                "/appointments/" + request.getAppointment().getAppointmentId()
        );
    }

    private void notifyDoctorRequestResult(Doctor doctor, DoctorScheduleChangeRequest request) {
        String title = request.getStatus() == ChangeRequestStatus.APPROVED ? "Schedule change request approved" : "Schedule change request rejected";
        String message = "Schedule change request status: " + request.getStatus() + ".";
        if (request.getAdminReason() != null) {
            message += " Reason: " + request.getAdminReason();
        }
        notificationService.sendWebSocketNotification(
                doctor.getUser(),
                NotificationType.ADMIN_SCHEDULE_CHANGE,
                title,
                message,
                request.getAppointment().getAppointmentId(),
                "/appointments/" + request.getAppointment().getAppointmentId()
        );
    }

    private void logDoctorScheduleChangeRequest(Doctor doctor, Appointment appointment, DoctorScheduleChangeRequest request, String actionType) {
        if (doctor != null && doctor.getUser() != null) {
            auditLogRepository.save(
                    AdminScheduleAuditLog.builder()
                            .adminUser(doctor.getUser())
                            .actionType(actionType)
                            .targetDoctorId(doctor.getDoctorId())
                            .targetAppointmentId(appointment != null ? appointment.getAppointmentId() : null)
                            .targetPatientId(appointment != null && appointment.getPatient() != null && appointment.getPatient().getUser() != null ? appointment.getPatient().getUser().getId() : null)
                            .description("Doctor schedule change request " + request.getRequestId() + " status " + request.getStatus())
                            .oldValue(null)
                            .newValue("{\"status\":\"" + request.getStatus() + "\",\"reason\":\"" + request.getReason() + "\"}")
                            .reason(request.getAdminReason())
                            .ipAddress(null)
                            .createdAt(LocalDateTime.now())
                            .build()
            );
        }
    }
}
