package com.HealthLink.controller.admin;

import com.HealthLink.dto.admin.*;
import com.HealthLink.entity.User;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.service.admin.AdminAppointmentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/adminappointments")
@CrossOrigin(origins = "http://localhost:63527")
@PreAuthorize("hasRole('ADMIN')")
public class AdminAppointmentController {

    private final AdminAppointmentService appointmentService;
    private final UserRepository userRepository;

    public AdminAppointmentController(AdminAppointmentService appointmentService, UserRepository userRepository) {
        this.appointmentService = appointmentService;
        this.userRepository = userRepository;
    }

    @GetMapping("/stats")
    public ResponseEntity<AdminAppointmentStatsDto> getStats() {
        return ResponseEntity.ok(appointmentService.getStats());
    }

    @GetMapping
    public ResponseEntity<AdminAppointmentPageResponse> getAppointments(
            @RequestParam(defaultValue = "1") int pageNumber,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(required = false) String searchTerm,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String department) {
        return ResponseEntity.ok(appointmentService.getAppointments(
                pageNumber, pageSize, searchTerm, date, startDate, endDate, status, department));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AdminAppointmentDto> getAppointmentById(@PathVariable Integer id) {
        return ResponseEntity.ok(appointmentService.getAppointmentById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AdminAppointmentDto> updateAppointment(
            @PathVariable Integer id,
            @RequestBody AdminAppointmentUpdateDto updateDto) {
        return ResponseEntity.ok(appointmentService.updateAppointment(id, updateDto));
    }

    /**
     * PUT /api/admin/adminappointments/{id}/reassign
     * Admin chuyển appointment sang bác sĩ khác.
     */
    @PutMapping("/{id}/reassign")
    public ResponseEntity<AdminAppointmentDto> reassignAppointment(
            @PathVariable Integer id,
            @Valid @RequestBody AdminAppointmentReassignRequest request,
            @AuthenticationPrincipal UserDetails userDetails,
            HttpServletRequest httpRequest) {

        // Ensure request appointmentId matches path variable
        request.setAppointmentId(id);

        String adminUserId = resolveUserId(userDetails);
        AdminAppointmentDto result = appointmentService.reassignAppointment(request, adminUserId, httpRequest);
        return ResponseEntity.ok(result);
    }

    /**
     * PUT /api/admin/adminappointments/{id}/cancel
     * Admin hủy appointment.
     */
    @PutMapping("/{id}/cancel")
    public ResponseEntity<AdminAppointmentDto> cancelAppointment(
            @PathVariable Integer id,
            @Valid @RequestBody AdminAppointmentCancelRequest request,
            @AuthenticationPrincipal UserDetails userDetails,
            HttpServletRequest httpRequest) {

        // Ensure request appointmentId matches path variable
        request.setAppointmentId(id);

        String adminUserId = resolveUserId(userDetails);
        AdminAppointmentDto result = appointmentService.cancelAppointment(request, adminUserId, httpRequest);
        return ResponseEntity.ok(result);
    }

    // ==================== Private Helper ====================

    private String resolveUserId(UserDetails userDetails) {
        String email = userDetails.getUsername();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found in DB: " + email));
        return user.getId();
    }
}
