package com.HealthLink.controller.admin;

import com.HealthLink.dto.registration.ApproveRejectRequest;
import com.HealthLink.dto.registration.RegistrationPageResponse;
import com.HealthLink.dto.registration.RegistrationRequestResponse;
import com.HealthLink.service.registration.RegistrationService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:63527"})
@RestController
@RequestMapping("/api/admin/registrations")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminRegistrationController {

    private final RegistrationService registrationService;

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
            @RequestHeader(value = "X-Admin-User-Id", defaultValue = "admin") String adminUserId
    ) {
        RegistrationRequestResponse response = registrationService.approveOrReject(
                requestId, request, adminUserId
        );
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{requestId}/review")
    public ResponseEntity<RegistrationRequestResponse> reviewRegistrationPost(
            @PathVariable Long requestId,
            @Valid @RequestBody ApproveRejectRequest request,
            @RequestHeader(value = "X-Admin-User-Id", defaultValue = "admin") String adminUserId
    ) {
        return reviewRegistration(requestId, request, adminUserId);
    }
}
