package com.HealthLink.controller.admin;

import com.HealthLink.dto.admin.AdminPharmacyDto;
import com.HealthLink.dto.admin.AdminPharmacyPageResponse;
import com.HealthLink.dto.admin.AdminPharmacyUpdateDto;
import com.HealthLink.dto.admin.PaypalEmailChangeRequest;
import com.HealthLink.dto.admin.PaypalEmailOtpRequest;
import com.HealthLink.dto.admin.StatusUpdateRequest;
import com.HealthLink.dto.admin.VerificationUpdateRequest;
import com.HealthLink.service.admin.AdminPharmacyService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@CrossOrigin(origins = "http://localhost:63527")
@RestController
@RequestMapping("/api/admin/adminpharmacies")
@PreAuthorize("hasRole('ADMIN')")
public class AdminPharmacyController {

    private final AdminPharmacyService adminPharmacyService;

    public AdminPharmacyController(AdminPharmacyService adminPharmacyService) {
        this.adminPharmacyService = adminPharmacyService;
    }

    @GetMapping
    public ResponseEntity<AdminPharmacyPageResponse> getPharmacies(
            @RequestParam(defaultValue = "1") int pageNumber,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(defaultValue = "") String searchTerm,
            @RequestParam(defaultValue = "") String status,
            @RequestParam(defaultValue = "") String city,
            @RequestParam(defaultValue = "") String verified,
            @RequestParam(defaultValue = "newest") String sortBy
    ) {
        AdminPharmacyPageResponse response = adminPharmacyService.getPharmacies(
            pageNumber, pageSize, searchTerm, status, city, verified, sortBy
        );
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{pharmacyId}")
    public ResponseEntity<AdminPharmacyDto> getPharmacyById(@PathVariable String pharmacyId) {
        AdminPharmacyDto pharmacy = adminPharmacyService.getPharmacyById(pharmacyId);
        return ResponseEntity.ok(pharmacy);
    }

    @PutMapping("/{pharmacyId}")
    public ResponseEntity<AdminPharmacyDto> updatePharmacy(
            @PathVariable String pharmacyId,
            @RequestBody AdminPharmacyUpdateDto updateDto
    ) {
        AdminPharmacyDto updated = adminPharmacyService.updatePharmacy(pharmacyId, updateDto);
        return ResponseEntity.ok(updated);
    }

    @PutMapping("/{pharmacyId}/status")
    public ResponseEntity<AdminPharmacyDto> updatePharmacyStatus(
            @PathVariable String pharmacyId,
            @RequestBody StatusUpdateRequest request,
            Authentication authentication
    ) {
        String adminUserId = authentication != null ? authentication.getName() : null;
        AdminPharmacyDto updated = adminPharmacyService.updatePharmacyStatus(
            pharmacyId,
            request.getStatus(),
            adminUserId,
            request.getReason()
        );
        return ResponseEntity.ok(updated);
    }

    @PutMapping("/{pharmacyId}/verify")
    public ResponseEntity<AdminPharmacyDto> updatePharmacyVerification(
            @PathVariable String pharmacyId,
            @RequestBody VerificationUpdateRequest request
    ) {
        AdminPharmacyDto updated = adminPharmacyService.updateVerification(pharmacyId, request.isVerified());
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{pharmacyId}")
    public ResponseEntity<Void> deletePharmacy(@PathVariable String pharmacyId) {
        adminPharmacyService.deletePharmacy(pharmacyId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{pharmacyId}/paypal-email/request")
    public ResponseEntity<Map<String, String>> requestPharmacyPaypalEmailChange(
            @PathVariable String pharmacyId,
            @Valid @RequestBody PaypalEmailChangeRequest request
    ) {
        adminPharmacyService.requestPharmacyPaypalEmailChange(pharmacyId, request.getNewPaypalEmail());
        return ResponseEntity.ok(Map.of("message", "OTP sent to " + request.getNewPaypalEmail()));
    }

    @PutMapping("/{pharmacyId}/paypal-email/verify")
    public ResponseEntity<AdminPharmacyDto> verifyPharmacyPaypalEmailChange(
            @PathVariable String pharmacyId,
            @Valid @RequestBody PaypalEmailOtpRequest request,
            Authentication authentication
    ) {
        String adminUserId = authentication != null ? authentication.getName() : null;
        AdminPharmacyDto updated = adminPharmacyService.verifyPharmacyPaypalEmailChange(
                pharmacyId, request.getOtp(), request.getReason(), adminUserId
        );
        return ResponseEntity.ok(updated);
    }
}
