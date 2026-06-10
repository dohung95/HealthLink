package com.HealthLink.controller.admin;

import com.HealthLink.dto.ai.ScreeningResult;
import com.HealthLink.dto.registration.ApproveRejectRequest;
import com.HealthLink.dto.registration.RegistrationPageResponse;
import com.HealthLink.dto.registration.RegistrationRequestResponse;
import com.HealthLink.service.ai.AIScreeningService;
import com.HealthLink.service.registration.RegistrationService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:63527"})
@RestController
@RequestMapping("/api/admin/registrations")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminRegistrationController {

    private final RegistrationService registrationService;
    private final AIScreeningService aiScreeningService;

    @GetMapping
    public ResponseEntity<RegistrationPageResponse> getRegistrations(
            @RequestParam(defaultValue = "1") int pageNumber,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(defaultValue = "") String type,
            @RequestParam(defaultValue = "") String status,
            @RequestParam(defaultValue = "newest") String sortBy
    ) {
        RegistrationPageResponse response = registrationService.getRegistrations(
                pageNumber, pageSize, type, status, sortBy
        );
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{requestId}")
    public ResponseEntity<RegistrationRequestResponse> getRegistrationById(
            @PathVariable Long requestId
    ) {
        RegistrationRequestResponse response = registrationService.getRegistrationById(requestId);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{requestId}/review")
    public ResponseEntity<RegistrationRequestResponse> reviewRegistration(
            @PathVariable Long requestId,
            @Valid @RequestBody ApproveRejectRequest request,
            Authentication authentication
    ) {
        String adminUserId = authentication != null ? authentication.getName() : null;
        RegistrationRequestResponse response = registrationService.approveOrReject(
                requestId, request, adminUserId
        );
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{requestId}/review")
    public ResponseEntity<RegistrationRequestResponse> reviewRegistrationPost(
            @PathVariable Long requestId,
            @Valid @RequestBody ApproveRejectRequest request,
            Authentication authentication
    ) {
        return reviewRegistration(requestId, request, authentication);
    }

    /**
     * Get AI screening details for a registration
     */
    @GetMapping("/{requestId}/screening")
    public ResponseEntity<ScreeningResult> getScreeningDetails(
            @PathVariable Long requestId
    ) {
        ScreeningResult result = aiScreeningService.screenRegistration(requestId);
        return ResponseEntity.ok(result);
    }

    /**
     * Trigger AI re-scan for a registration
     */
    @PostMapping("/{requestId}/screening/rescan")
    public ResponseEntity<ScreeningResult> rescanRegistration(
            @PathVariable Long requestId
    ) {
        ScreeningResult result = aiScreeningService.rescanRegistration(requestId);
        return ResponseEntity.ok(result);
    }

    /**
     * Override AI decision (admin can approve despite AI rejection)
     */
    @PutMapping("/{requestId}/screening/override")
    public ResponseEntity<Map<String, String>> overrideAIDecision(
            @PathVariable Long requestId,
            @RequestBody Map<String, String> body,
            Authentication authentication
    ) {
        String adminId = authentication != null ? authentication.getName() : "unknown";
        String reason = body.getOrDefault("reason", "Admin override");
        aiScreeningService.overrideAIDecision(requestId, adminId, reason);
        return ResponseEntity.ok(Map.of("message", "AI decision overridden successfully"));
    }
}
