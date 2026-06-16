package com.HealthLink.controller.doctor;

import com.HealthLink.dto.compliance.ComplianceStatusResponse;
import com.HealthLink.dto.compliance.ValidateScheduleRequest;
import com.HealthLink.dto.compliance.ValidateScheduleResponse;
import com.HealthLink.exception.BadRequestException;
import com.HealthLink.service.compliance.ScheduleComplianceService;
import com.HealthLink.utility.DoctorSecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/doctors/compliance")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "${app.cors.allowed-origins}")
public class DoctorComplianceController {

    private final ScheduleComplianceService complianceService;
    private final DoctorSecurityUtils securityUtils;

    /**
     * Get compliance status for current month and next month.
     * GET /api/doctors/compliance/status
     */
    @GetMapping("/status")
    public ResponseEntity<ComplianceStatusResponse> getComplianceStatus(
            @AuthenticationPrincipal UserDetails userDetails) {
        String doctorId = securityUtils.resolveDoctor(userDetails).getDoctorId();
        ComplianceStatusResponse response = complianceService.getComplianceStatus(doctorId);
        return ResponseEntity.ok(response);
    }

    /**
     * Check compliance for a specific month.
     * GET /api/doctors/compliance/check?month=2026-06
     */
    @GetMapping("/check")
    public ResponseEntity<ComplianceStatusResponse> checkCompliance(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam String month) {
        String doctorId = securityUtils.resolveDoctor(userDetails).getDoctorId();
        ComplianceStatusResponse response = complianceService.checkCompliance(doctorId, month);
        return ResponseEntity.ok(response);
    }

    /**
     * Validate schedule and get compliance status with warnings.
     * POST /api/doctors/compliance/validate
     */
    @PostMapping("/validate")
    public ResponseEntity<ValidateScheduleResponse> validateSchedule(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody(required = false) ValidateScheduleRequest request) {
        if (request == null) {
            throw new BadRequestException("Request body is required");
        }
        String doctorId = securityUtils.resolveDoctor(userDetails).getDoctorId();
        ValidateScheduleResponse response = complianceService.validateSchedule(doctorId, request);
        return ResponseEntity.ok(response);
    }
}
