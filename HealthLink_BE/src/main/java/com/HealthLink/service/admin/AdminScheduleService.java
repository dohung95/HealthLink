package com.HealthLink.service.admin;

import com.HealthLink.dto.admin.AdminDoctorScheduleDto;
import com.HealthLink.dto.admin.AdminScheduleExceptionRequest;
import com.HealthLink.dto.admin.schedule.AdminAuditLogDto;
import com.HealthLink.dto.admin.schedule.AdminAuditLogPageResponse;
import com.HealthLink.entity.*;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.admin.AdminScheduleAuditLogRepository;
import com.HealthLink.repository.admin.DoctorScheduleExceptionRepository;
import com.HealthLink.repository.doctor.DoctorScheduleRepository;
import com.HealthLink.repository.admin.AdminDoctorRepository;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.service.admin.AdminNotificationService;
import com.HealthLink.entity.enums.NotificationType;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class AdminScheduleService {

    private final DoctorScheduleRepository scheduleRepository;
    private final DoctorScheduleExceptionRepository exceptionRepository;
    private final AdminScheduleAuditLogRepository auditLogRepository;
    private final AdminDoctorRepository doctorRepository;
    private final UserRepository userRepository;
    private final AdminNotificationService adminNotificationService;

    public AdminScheduleService(
            DoctorScheduleRepository scheduleRepository,
            DoctorScheduleExceptionRepository exceptionRepository,
            AdminScheduleAuditLogRepository auditLogRepository,
            AdminDoctorRepository doctorRepository,
            UserRepository userRepository,
            AdminNotificationService adminNotificationService) {
        this.scheduleRepository = scheduleRepository;
        this.exceptionRepository = exceptionRepository;
        this.auditLogRepository = auditLogRepository;
        this.doctorRepository = doctorRepository;
        this.userRepository = userRepository;
        this.adminNotificationService = adminNotificationService;
    }

    /**
     * Lấy lịch làm việc của bác sĩ (bao gồm cả exceptions).
     */
    public AdminDoctorScheduleDto getDoctorSchedule(String doctorId) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor", "id", doctorId));

        List<DoctorSchedule> schedules = scheduleRepository.findByDoctor_DoctorId(doctorId);
        List<DoctorScheduleException> exceptions = exceptionRepository.findByDoctor_DoctorId(doctorId);

        return mapToDto(doctor, schedules, exceptions);
    }

    /**
     * Lấy lịch làm việc của bác sĩ trong khoảng thời gian (bao gồm exceptions).
     */
    public AdminDoctorScheduleDto getDoctorScheduleInRange(String doctorId, LocalDate startDate, LocalDate endDate) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor", "id", doctorId));

        List<DoctorSchedule> schedules = scheduleRepository.findByDoctor_DoctorId(doctorId);
        List<DoctorScheduleException> exceptions = exceptionRepository
                .findByDoctor_DoctorIdAndExceptionDateBetween(doctorId, startDate, endDate);

        return mapToDto(doctor, schedules, exceptions);
    }

    /**
     * Admin tạo exception (block/mở slot) cho bác sĩ.
     */
    public AdminDoctorScheduleDto.ExceptionItem createScheduleException(
            AdminScheduleExceptionRequest request,
            String adminUserId,
            HttpServletRequest httpRequest) {

        Doctor doctor = doctorRepository.findById(request.getDoctorId())
                .orElseThrow(() -> new ResourceNotFoundException("Doctor", "id", request.getDoctorId()));

        User adminUser = userRepository.findById(adminUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin User", "id", adminUserId));

        // Validate exception type
        validateExceptionType(request.getExceptionType());

        // Check nếu đã có exception cho ngày này
        exceptionRepository.findByDoctor_DoctorIdAndExceptionDate(
                request.getDoctorId(), request.getExceptionDate())
                .ifPresent(existing -> {
                    throw new BadRequestException("Already exists an exception for this date. Delete it first.");
                });

        // Tạo exception với reason có prefix [Admin]
        String adminReason = "[Admin] " + request.getReason();

        DoctorScheduleException exception = DoctorScheduleException.builder()
                .doctor(doctor)
                .exceptionDate(request.getExceptionDate())
                .exceptionType(request.getExceptionType())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .reason(adminReason)
                .recurring(request.isRecurring())
                .recurringUntil(request.getRecurringUntil())
                .build();

        DoctorScheduleException saved = exceptionRepository.save(exception);

        // Ghi audit log
        logAdminAction(
                adminUser,
                "BLOCK_SLOT".equals(request.getExceptionType()) ? "BLOCK_SLOT" : "MODIFY_SCHEDULE",
                request.getDoctorId(),
                null,
                null,
                "Created schedule exception: " + request.getExceptionType() + " on " + request.getExceptionDate(),
                null,
                exceptionToJson(saved),
                request.getReason(),
                getClientIp(httpRequest)
        );

        // Gửi notification cho bác sĩ
        notifyDoctorScheduleChange(doctor, request.getExceptionType(), request.getExceptionDate(), adminReason);

        return mapExceptionToDto(saved);
    }

    /**
     * Admin xóa exception của bác sĩ.
     */
    public void deleteScheduleException(
            Integer exceptionId,
            String adminUserId,
            HttpServletRequest httpRequest) {

        DoctorScheduleException exception = exceptionRepository.findById(exceptionId)
                .orElseThrow(() -> new ResourceNotFoundException("Schedule Exception", "id", exceptionId.toString()));

        User adminUser = userRepository.findById(adminUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin User", "id", adminUserId));

        String doctorId = exception.getDoctor().getDoctorId();

        // Ghi audit log trước khi xóa
        logAdminAction(
                adminUser,
                "UNBLOCK_SLOT",
                doctorId,
                null,
                null,
                "Deleted schedule exception on " + exception.getExceptionDate(),
                exceptionToJson(exception),
                null,
                "Admin removed schedule exception",
                getClientIp(httpRequest)
        );

        exceptionRepository.delete(exception);

        // Notify doctor
        notifyDoctorScheduleChange(
                exception.getDoctor(),
                "UNBLOCK",
                exception.getExceptionDate(),
                "Admin đã gỡ bỏ ngoại lệ lịch của bạn vào ngày " + exception.getExceptionDate()
        );
    }

    /**
     * Lấy audit logs với filters.
     */
    public AdminAuditLogPageResponse getAuditLogs(
            int pageNumber,
            int pageSize,
            String adminUserId,
            String doctorId,
            String actionType,
            LocalDateTime startTime,
            LocalDateTime endTime) {

        Pageable pageable = PageRequest.of(Math.max(pageNumber - 1, 0), Math.max(pageSize, 1));

        Page<AdminScheduleAuditLog> page = auditLogRepository.findWithFilters(
                adminUserId, doctorId, actionType, startTime, endTime, pageable);

        List<AdminAuditLogDto> logs = page.stream()
                .map(this::mapAuditLogToDto)
                .collect(Collectors.toList());

        return AdminAuditLogPageResponse.builder()
                .logs(logs)
                .currentPage(page.getNumber() + 1)
                .totalPages(page.getTotalPages())
                .totalElements(page.getTotalElements())
                .pageSize(page.getSize())
                .hasNext(page.hasNext())
                .hasPrevious(page.hasPrevious())
                .build();
    }

    // ==================== Private Helper Methods ====================

    private void validateExceptionType(String type) {
        if (type == null || (!type.equals("DayOff") && !type.equals("Modified") && !type.equals("AddSlot"))) {
            throw new BadRequestException("Invalid exception type. Must be: DayOff, Modified, or AddSlot");
        }
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

    private void notifyDoctorScheduleChange(Doctor doctor, String changeType, LocalDate date, String reason) {
        if (doctor.getUser() != null) {
            String title = "Thay đổi lịch làm việc";
            String message = String.format(
                    "Admin đã %s lịch của bạn vào ngày %s. Lý do: %s",
                    getChangeTypeDisplay(changeType),
                    date.toString(),
                    reason
            );

            // Sử dụng Admin notification system độc lập
            adminNotificationService.sendWebSocketNotification(
                    doctor.getUser().getId(),
                    NotificationType.ADMIN_SCHEDULE_CHANGE,
                    title,
                    message,
                    null
            );
        }
    }

    private String getChangeTypeDisplay(String type) {
        switch (type) {
            case "DayOff": return "đánh dấu nghỉ";
            case "Modified": return "thay đổi giờ làm việc";
            case "AddSlot": return "thêm ca làm việc";
            case "UNBLOCK": return "gỡ bỏ ngoại lệ";
            default: return "thay đổi";
        }
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private String exceptionToJson(DoctorScheduleException e) {
        return String.format(
                "{\"exceptionId\":%d,\"date\":\"%s\",\"type\":\"%s\",\"startTime\":\"%s\",\"endTime\":\"%s\"}",
                e.getExceptionId(),
                e.getExceptionDate(),
                e.getExceptionType(),
                e.getStartTime(),
                e.getEndTime()
        );
    }

    private AdminDoctorScheduleDto mapToDto(Doctor doctor, List<DoctorSchedule> schedules, List<DoctorScheduleException> exceptions) {
        return AdminDoctorScheduleDto.builder()
                .doctorId(doctor.getDoctorId())
                .doctorName(doctor.getFullName())
                .specialty(doctor.getSpecialty())
                .avatarUrl(doctor.getAvatarUrl())
                .schedules(schedules.stream().map(this::mapScheduleToDto).collect(Collectors.toList()))
                .exceptions(exceptions.stream().map(this::mapExceptionToDto).collect(Collectors.toList()))
                .build();
    }

    private AdminDoctorScheduleDto.ScheduleItem mapScheduleToDto(DoctorSchedule s) {
        return AdminDoctorScheduleDto.ScheduleItem.builder()
                .scheduleId(s.getScheduleId())
                .dayOfWeek(s.getDayOfWeek())
                .dayOfWeekName(getDayOfWeekName(s.getDayOfWeek()))
                .startTime(s.getStartTime())
                .endTime(s.getEndTime())
                .slotDuration(s.getSlotDuration())
                .maxPatients(s.getMaxPatients())
                .available(s.isAvailable())
                .consultationType(s.getConsultationType())
                .location(s.getLocation())
                .notes(s.getNotes())
                .build();
    }

    private AdminDoctorScheduleDto.ExceptionItem mapExceptionToDto(DoctorScheduleException e) {
        return AdminDoctorScheduleDto.ExceptionItem.builder()
                .exceptionId(e.getExceptionId())
                .exceptionDate(e.getExceptionDate())
                .exceptionType(e.getExceptionType())
                .startTime(e.getStartTime())
                .endTime(e.getEndTime())
                .reason(e.getReason())
                .recurring(e.isRecurring())
                .recurringUntil(e.getRecurringUntil())
                .isAdminCreated(e.getReason() != null && e.getReason().contains("[Admin]"))
                .build();
    }

    private AdminAuditLogDto mapAuditLogToDto(AdminScheduleAuditLog log) {
        User admin = log.getAdminUser();
        return AdminAuditLogDto.builder()
                .logId(log.getLogId())
                .adminUserId(admin != null ? admin.getId() : null)
                .adminUserName(admin != null ? admin.getUsername() : null)
                .adminEmail(admin != null ? admin.getEmail() : null)
                .actionType(log.getActionType())
                .actionTypeDisplay(getActionTypeDisplay(log.getActionType()))
                .description(log.getDescription())
                .reason(log.getReason())
                .targetDoctorId(log.getTargetDoctorId())
                .targetDoctorName(getDoctorName(log.getTargetDoctorId()))
                .targetAppointmentId(log.getTargetAppointmentId())
                .targetPatientId(log.getTargetPatientId())
                .targetPatientName(null) // Can be expanded if needed
                .oldValue(log.getOldValue())
                .newValue(log.getNewValue())
                .createdAt(log.getCreatedAt())
                .ipAddress(log.getIpAddress())
                .build();
    }

    private String getActionTypeDisplay(String actionType) {
        if (actionType == null) return "";
        switch (actionType) {
            case "BLOCK_SLOT": return "Block slot";
            case "UNBLOCK_SLOT": return "Unblock slot";
            case "MODIFY_SCHEDULE": return "Sửa lịch";
            case "CANCEL_APPOINTMENT": return "Hủy lịch hẹn";
            case "REASSIGN_APPOINTMENT": return "Chuyển bác sĩ";
            default: return actionType;
        }
    }

    private String getDoctorName(String doctorId) {
        if (doctorId == null) return null;
        return doctorRepository.findById(doctorId)
                .map(Doctor::getFullName)
                .orElse(null);
    }

    private String getDayOfWeekName(Integer dayOfWeek) {
        if (dayOfWeek == null) return "";
        switch (dayOfWeek) {
            case 0: return "Chủ nhật";
            case 1: return "Thứ 2";
            case 2: return "Thứ 3";
            case 3: return "Thứ 4";
            case 4: return "Thứ 5";
            case 5: return "Thứ 6";
            case 6: return "Thứ 7";
            default: return "";
        }
    }
}
