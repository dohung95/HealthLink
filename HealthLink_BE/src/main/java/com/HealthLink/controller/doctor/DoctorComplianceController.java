package com.HealthLink.controller.doctor;

import com.HealthLink.dto.compliance.ComplianceStatusResponse;
import com.HealthLink.dto.compliance.ValidateScheduleRequest;
import com.HealthLink.dto.compliance.ValidateScheduleResponse;
import com.HealthLink.entity.User;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.repository.doctor.DoctorRepository;
import com.HealthLink.service.compliance.ScheduleComplianceService;
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
@CrossOrigin(origins = "http://localhost:63527")
public class DoctorComplianceController {

    private final ScheduleComplianceService complianceService;
    private final UserRepository userRepository;
    private final DoctorRepository doctorRepository;

    /**
     * Get compliance status for current month and next month.
     * GET /api/doctors/compliance/status
     */
    @GetMapping("/status")
    public ResponseEntity<ComplianceStatusResponse> getComplianceStatus(
            @AuthenticationPrincipal UserDetails userDetails) {
        String doctorId = resolveDoctorId(userDetails);
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
        String doctorId = resolveDoctorId(userDetails);
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
        String doctorId = resolveDoctorId(userDetails);
        ValidateScheduleResponse response = complianceService.validateSchedule(doctorId, request);
        return ResponseEntity.ok(response);
    }

    /**
     * Resolve doctor ID from authenticated user.
     */
    private String resolveDoctorId(UserDetails userDetails) {
        String email = userDetails.getUsername();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found: " + email));

        // Check if user is a doctor
        return doctorRepository.findById(user.getId())
                .map(doctor -> doctor.getDoctorId())
                .orElseThrow(() -> new IllegalStateException("User is not a doctor: " + user.getId()));
    }
}
