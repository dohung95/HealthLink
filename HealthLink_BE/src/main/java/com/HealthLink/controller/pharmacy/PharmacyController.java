package com.HealthLink.controller.pharmacy;

import com.HealthLink.dto.auth.ChangeEmailRequest;
import com.HealthLink.dto.auth.ChangePasswordRequest;
import com.HealthLink.dto.auth.VerifyEmailChangeRequest;
import com.HealthLink.dto.pharmacy.PharmacyProfileResponse;
import com.HealthLink.dto.pharmacy.PharmacyUpdateRequest;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.service.pharmacy.PharmacyProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

/**
 * REST controller cho Pharmacy profile management.
 *
 * GET    /api/pharmacy/profile              → Xem profile của mình
 * GET    /api/pharmacy/profile/{pharmacyId} → Xem profile theo ID (công khai)
 * PUT    /api/pharmacy/profile              → Cập nhật profile
 * POST   /api/pharmacy/email/request-change → Yêu cầu đổi email (gửi OTP)
 * POST   /api/pharmacy/email/verify-change  → Xác nhận đổi email
 */
@RestController
@RequestMapping("/api/account/pharmacy")
@RequiredArgsConstructor
@Slf4j
public class PharmacyController {

    private final PharmacyProfileService pharmacyProfileService;
    private final UserRepository userRepository;

    // Helper: lấy userId từ JWT token
    private String resolveUserId(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User", "email", userDetails.getUsername()))
                .getId();
    }

    // ── Xem profile của chính mình ───────────────────────────────────────────
    @GetMapping("/profile")
    @PreAuthorize("hasRole('PHARMACY')")
    public ResponseEntity<PharmacyProfileResponse> getMyProfile(
            @AuthenticationPrincipal UserDetails userDetails) {
        String pharmacyId = resolveUserId(userDetails);
        return ResponseEntity.ok(pharmacyProfileService.getPharmacyProfile(pharmacyId));
    }

    // ── Xem profile theo ID (bệnh nhân / bác sĩ tìm nhà thuốc) ─────────────
    @GetMapping("/profile/{pharmacyId}")
    public ResponseEntity<PharmacyProfileResponse> getPharmacyProfile(
            @PathVariable String pharmacyId) {
        return ResponseEntity.ok(pharmacyProfileService.getPharmacyProfile(pharmacyId));
    }

    // ── Cập nhật profile ─────────────────────────────────────────────────────
    @PutMapping("/profile")
    @PreAuthorize("hasRole('PHARMACY')")
    public ResponseEntity<PharmacyProfileResponse> updateMyProfile(
            @Valid @RequestBody PharmacyUpdateRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String pharmacyId = resolveUserId(userDetails);
        PharmacyProfileResponse updated = pharmacyProfileService.updatePharmacyProfile(pharmacyId, request);
        return ResponseEntity.ok(updated);
    }

    // ── Yêu cầu đổi email – gửi OTP về email mới ────────────────────────────
    @PostMapping("auth/email/request-change")
    @PreAuthorize("hasRole('PHARMACY')")
    public ResponseEntity<String> requestEmailChange(
            @Valid @RequestBody ChangeEmailRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String pharmacyId = resolveUserId(userDetails);
        String message = pharmacyProfileService.requestEmailChange(pharmacyId, request);
        return ResponseEntity.ok(message);
    }

    // ── Xác nhận đổi email bằng OTP ─────────────────────────────────────────
    @PostMapping("auth/email/verify-change")
    @PreAuthorize("hasRole('PHARMACY')")
    public ResponseEntity<PharmacyProfileResponse> verifyEmailChange(
            @Valid @RequestBody VerifyEmailChangeRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String pharmacyId = resolveUserId(userDetails);
        PharmacyProfileResponse updated = pharmacyProfileService.verifyEmailChange(pharmacyId, request);
        return ResponseEntity.ok(updated);
    }

    // ── Upload ảnh đại diện cho nhà thuốc ───────────────────────────────
    @PutMapping("auth/password/change")
    @PreAuthorize("hasRole('PHARMACY')")
    public ResponseEntity<Void> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String pharmacyId = resolveUserId(userDetails);
        pharmacyProfileService.changePassword(pharmacyId, request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/avatar")
    @PreAuthorize("hasRole('PHARMACY')")
    public ResponseEntity<?> uploadAvatar(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserDetails userDetails) {
        String pharmacyId = resolveUserId(userDetails);
        try {
            String avatarUrl = pharmacyProfileService.uploadAvatar(pharmacyId, file);
            return ResponseEntity.ok(Map.of("avatarUrl", avatarUrl));
        } catch (IOException e) {
            log.error("Avatar upload failed for pharmacy {}: {}", pharmacyId, e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Failed to upload: " + e.getMessage()));
        }
    }
}
