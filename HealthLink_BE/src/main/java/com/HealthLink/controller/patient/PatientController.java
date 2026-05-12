package com.HealthLink.controller.patient;

import com.HealthLink.dto.auth.ChangeEmailRequest;
import com.HealthLink.dto.auth.VerifyEmailChangeRequest;
import com.HealthLink.dto.patient.*;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.service.patient.PatientProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller cho patient profile management
 * Base URL: /api/patient
 */
@RestController
@RequestMapping("/api/patient")
@RequiredArgsConstructor
public class PatientController {

    private final PatientProfileService patientProfileService;
    private final UserRepository userRepository;

    /**
     * Helper: lấy userId từ email trong JWT
     */
    private String resolveUserId(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User", "email", userDetails.getUsername()))
                .getId();
    }

    /**
     * GET /api/patient/profile
     * Lấy toàn bộ thông tin profile của patient hiện tại
     * Yêu cầu: JWT token hợp lệ
     */
    @GetMapping("/profile")
    public ResponseEntity<PatientProfileDTO> getMyProfile(
            @AuthenticationPrincipal UserDetails userDetails) {
        String userId = resolveUserId(userDetails);
        PatientProfileDTO profile = patientProfileService.getPatientProfile(userId);
        return ResponseEntity.ok(profile);
    }

    /**
     * GET /api/patient/profile/{patientId}
     * Lấy thông tin profile patient theo ID
     * (Có thể dùng cho doctor xem thông tin patient của họ)
     */
    @GetMapping("/profile/{patientId}")
    public ResponseEntity<PatientProfileDTO> getPatientProfile(
            @PathVariable String patientId) {
        PatientProfileDTO profile = patientProfileService.getPatientProfileById(patientId);
        return ResponseEntity.ok(profile);
    }

    /**
     * PUT /api/patient/profile
     * Cập nhật thông tin patient (ngoài email)
     * Yêu cầu: JWT token hợp lệ
     */
    @PutMapping("/profile")
    public ResponseEntity<PatientProfileDTO> updateMyProfile(
            @Valid @RequestBody UpdatePatientProfileRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String userId = resolveUserId(userDetails);
        PatientProfileDTO updated = patientProfileService.updatePatientProfile(userId, request);
        return ResponseEntity.ok(updated);
    }

    /**
     * POST /api/patient/email/request-change
     * Yêu cầu thay đổi email - gửi verification code qua email
     * Yêu cầu: JWT token hợp lệ + password hiện tại để xác nhận
     */
    @PostMapping("auth/email/request-change")
    public ResponseEntity<String> requestEmailChange(
            @Valid @RequestBody ChangeEmailRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String userId = resolveUserId(userDetails);
        String message = patientProfileService.requestEmailChange(userId, request);
        return ResponseEntity.ok(message);
    }

    /**
     * POST /api/patient/email/verify-change
     * Xác nhận thay đổi email với verification code
     * Yêu cầu: JWT token hợp lệ + verification code
     */
    @PostMapping("auth/email/verify-change")
    public ResponseEntity<PatientProfileDTO> verifyEmailChange(
            @Valid @RequestBody VerifyEmailChangeRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String userId = resolveUserId(userDetails);
        PatientProfileDTO updated = patientProfileService.verifyEmailChange(userId, request);
        return ResponseEntity.ok(updated);
    }
}
