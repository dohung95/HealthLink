package com.HealthLink.controller.admin;

import com.HealthLink.dto.compliance.*;
import com.HealthLink.entity.User;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.service.compliance.ScheduleComplianceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/compliance")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "http://localhost:63527")
@PreAuthorize("hasRole('ADMIN')")
public class AdminComplianceController {

    private final ScheduleComplianceService complianceService;
    private final UserRepository userRepository;

    /**
     * Get all doctors' compliance for a month with pagination.
     * GET /api/admin/compliance?month=2026-06&status=IN_PROGRESS&pageNumber=1&pageSize=20
     */
    @GetMapping
    public ResponseEntity<CompliancePageResponse> getAllCompliance(
            @RequestParam String month,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Integer specialtyId,
            @RequestParam(defaultValue = "1") int pageNumber,
            @RequestParam(defaultValue = "20") int pageSize) {

        Pageable pageable = PageRequest.of(pageNumber - 1, pageSize);
        CompliancePageResponse response = complianceService.getAllCompliance(month, status, specialtyId, pageable);
        return ResponseEntity.ok(response);
    }

    /**
     * Get compliance statistics for a month.
     * GET /api/admin/compliance/statistics?month=2026-06
     */
    @GetMapping("/statistics")
    public ResponseEntity<ComplianceStatisticsResponse> getStatistics(
            @RequestParam String month) {
        ComplianceStatisticsResponse response = complianceService.getStatistics(month);
        return ResponseEntity.ok(response);
    }

    /**
     * Exempt a doctor from compliance requirement.
     * POST /api/admin/compliance/{doctorId}/exempt
     */
    @PostMapping("/{doctorId}/exempt")
    public ResponseEntity<DoctorComplianceResponse> exemptDoctor(
            @PathVariable String doctorId,
            @Valid @RequestBody ExemptDoctorRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String adminUserId = resolveUserId(userDetails);
        DoctorComplianceResponse response = complianceService.exemptDoctor(doctorId, request, adminUserId);
        return ResponseEntity.ok(response);
    }

    /**
     * Get all compliance configurations.
     * GET /api/admin/compliance/config?active=true
     */
    @GetMapping("/config")
    public ResponseEntity<List<ComplianceConfigResponse>> getConfigs(
            @RequestParam(required = false) Boolean active) {
        List<ComplianceConfigResponse> configs = complianceService.getAllConfigs(active);
        return ResponseEntity.ok(configs);
    }

    /**
     * Create a new compliance configuration.
     * POST /api/admin/compliance/config
     */
    @PostMapping("/config")
    public ResponseEntity<ComplianceConfigResponse> createConfig(
            @Valid @RequestBody ComplianceConfigRequest request) {
        ComplianceConfigResponse response = complianceService.createConfig(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Update a compliance configuration.
     * PUT /api/admin/compliance/config/{configId}
     */
    @PutMapping("/config/{configId}")
    public ResponseEntity<ComplianceConfigResponse> updateConfig(
            @PathVariable Integer configId,
            @Valid @RequestBody ComplianceConfigRequest request) {
        ComplianceConfigResponse response = complianceService.updateConfig(configId, request);
        return ResponseEntity.ok(response);
    }

    /**
     * Delete a compliance configuration.
     * DELETE /api/admin/compliance/config/{configId}
     */
    @DeleteMapping("/config/{configId}")
    public ResponseEntity<Map<String, String>> deleteConfig(
            @PathVariable Integer configId) {
        complianceService.deleteConfig(configId);
        return ResponseEntity.ok(Map.of("message", "Config deleted successfully"));
    }

    /**
     * Manually trigger compliance check (for testing).
     * POST /api/admin/compliance/trigger-check
     */
    @PostMapping("/trigger-check")
    public ResponseEntity<Map<String, String>> triggerComplianceCheck() {
        complianceService.checkDailyCompliance();
        return ResponseEntity.ok(Map.of("message", "Compliance check triggered"));
    }

    /**
     * Resolve user ID from authenticated user.
     */
    private String resolveUserId(UserDetails userDetails) {
        String email = userDetails.getUsername();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found: " + email));
        return user.getId();
    }
}
