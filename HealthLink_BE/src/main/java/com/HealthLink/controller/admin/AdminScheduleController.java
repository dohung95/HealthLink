package com.HealthLink.controller.admin;

import com.HealthLink.dto.admin.AdminDoctorScheduleDto;
import com.HealthLink.dto.admin.AdminScheduleExceptionRequest;
import com.HealthLink.dto.admin.schedule.AdminAuditLogPageResponse;
import com.HealthLink.dto.doctor.schedule.DoctorScheduleChangeRequestResponse;
import com.HealthLink.entity.User;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.service.admin.AdminScheduleService;
import com.HealthLink.service.doctor.DoctorScheduleChangeRequestService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "http://localhost:63527")
@RestController
@RequestMapping("/api/admin/schedule")
@PreAuthorize("hasRole('ADMIN')")
public class AdminScheduleController {

    private final AdminScheduleService adminScheduleService;
    private final DoctorScheduleChangeRequestService changeRequestService;
    private final UserRepository userRepository;

    public AdminScheduleController(AdminScheduleService adminScheduleService,
                                   DoctorScheduleChangeRequestService changeRequestService,
                                   UserRepository userRepository) {
        this.adminScheduleService = adminScheduleService;
        this.changeRequestService = changeRequestService;
        this.userRepository = userRepository;
    }

    /**
     * GET /api/admin/schedule/doctors/{doctorId}
     * Lấy lịch làm việc của bác sĩ (bao gồm exceptions).
     */
    @GetMapping("/doctors/{doctorId}")
    public ResponseEntity<AdminDoctorScheduleDto> getDoctorSchedule(@PathVariable String doctorId) {
        AdminDoctorScheduleDto schedule = adminScheduleService.getDoctorSchedule(doctorId);
        return ResponseEntity.ok(schedule);
    }

    /**
     * GET /api/admin/schedule/doctors/{doctorId}/range
     * Lấy lịch làm việc của bác sĩ trong khoảng thời gian.
     */
    @GetMapping("/doctors/{doctorId}/range")
    public ResponseEntity<AdminDoctorScheduleDto> getDoctorScheduleInRange(
            @PathVariable String doctorId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        AdminDoctorScheduleDto schedule = adminScheduleService.getDoctorScheduleInRange(doctorId, startDate, endDate);
        return ResponseEntity.ok(schedule);
    }

    /**
     * POST /api/admin/schedule/exceptions
     * Admin tạo exception (block/mở slot) cho bác sĩ.
     */
    @PostMapping("/exceptions")
    public ResponseEntity<AdminDoctorScheduleDto.ExceptionItem> createScheduleException(
            @Valid @RequestBody AdminScheduleExceptionRequest request,
            @AuthenticationPrincipal UserDetails userDetails,
            HttpServletRequest httpRequest) {

        String adminUserId = resolveUserId(userDetails);
        AdminDoctorScheduleDto.ExceptionItem exception = adminScheduleService.createScheduleException(
                request, adminUserId, httpRequest);
        return ResponseEntity.ok(exception);
    }

    /**
     * DELETE /api/admin/schedule/exceptions/{exceptionId}
     * Admin xóa exception.
     */
    @DeleteMapping("/exceptions/{exceptionId}")
    public ResponseEntity<Map<String, String>> deleteScheduleException(
            @PathVariable Integer exceptionId,
            @AuthenticationPrincipal UserDetails userDetails,
            HttpServletRequest httpRequest) {

        String adminUserId = resolveUserId(userDetails);
        adminScheduleService.deleteScheduleException(exceptionId, adminUserId, httpRequest);
        return ResponseEntity.ok(Map.of("message", "Schedule exception deleted successfully"));
    }

    @GetMapping("/change-requests")
    public ResponseEntity<List<DoctorScheduleChangeRequestResponse>> getChangeRequests() {
        return ResponseEntity.ok(changeRequestService.getAllChangeRequests());
    }

    @PostMapping("/change-requests/{requestId}/approve")
    public ResponseEntity<DoctorScheduleChangeRequestResponse> approveChangeRequest(
            @PathVariable Integer requestId,
            @RequestParam(required = false) String adminReason,
            @AuthenticationPrincipal UserDetails userDetails) {

        String adminUserId = resolveUserId(userDetails);
        return ResponseEntity.ok(changeRequestService.approveChangeRequest(requestId, adminUserId, adminReason));
    }

    @PostMapping("/change-requests/{requestId}/reject")
    public ResponseEntity<DoctorScheduleChangeRequestResponse> rejectChangeRequest(
            @PathVariable Integer requestId,
            @RequestParam(required = false) String adminReason,
            @AuthenticationPrincipal UserDetails userDetails) {

        String adminUserId = resolveUserId(userDetails);
        return ResponseEntity.ok(changeRequestService.rejectChangeRequest(requestId, adminUserId, adminReason));
    }

    /**
     * GET /api/admin/schedule/audit-log
     * Lấy lịch sử hành động của Admin.
     */
    @GetMapping("/audit-log")
    public ResponseEntity<AdminAuditLogPageResponse> getAuditLogs(
            @RequestParam(defaultValue = "1") int pageNumber,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestParam(required = false) String adminUserId,
            @RequestParam(required = false) String doctorId,
            @RequestParam(required = false) String actionType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {

        AdminAuditLogPageResponse response = adminScheduleService.getAuditLogs(
                pageNumber, pageSize, adminUserId, doctorId, actionType, startTime, endTime);
        return ResponseEntity.ok(response);
    }

    // ==================== Private Helper ====================

    private String resolveUserId(UserDetails userDetails) {
        String email = userDetails.getUsername();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found in DB: " + email));
        return user.getId();
    }
}
