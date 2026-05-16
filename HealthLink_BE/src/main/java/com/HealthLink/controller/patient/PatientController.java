package com.HealthLink.controller.patient;

import com.HealthLink.dto.auth.ChangeEmailRequest;
import com.HealthLink.dto.auth.ChangePasswordRequest;
import com.HealthLink.dto.auth.VerifyEmailChangeRequest;
import com.HealthLink.dto.patient.*;
import com.HealthLink.exception.ResourceNotFoundException;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.service.patient.PatientProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

/**
 * REST controller cho patient profile management.
 * Controller chỉ nhận request, resolve userId và delegate hoàn toàn về Service.
 * Base URL: /api/account/patient
 */
@RestController
@RequestMapping("/api/account/patient")
@RequiredArgsConstructor
@Slf4j
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
     * GET /api/account/patient/profile
     * Lấy toàn bộ thông tin profile của patient hiện tại
     * Yêu cầu: JWT token hợp lệ
     */
    @GetMapping("/profile")
    public ResponseEntity<PatientProfileDTO> getMyProfile(
            @AuthenticationPrincipal UserDetails userDetails) {
        String userId = resolveUserId(userDetails);
        return ResponseEntity.ok(patientProfileService.getPatientProfile(userId));
    }

    /**
     * GET /api/account/patient/profile/{patientId}
     * Lấy thông tin profile patient theo ID (dùng cho doctor xem thông tin patient)
     */
    @GetMapping("/profile/{patientId}")
    public ResponseEntity<PatientProfileDTO> getPatientProfile(
            @PathVariable String patientId) {
        return ResponseEntity.ok(patientProfileService.getPatientProfileById(patientId));
    }

    /**
     * PUT /api/account/patient/profile
     * Cập nhật thông tin patient (ngoài email)
     * Yêu cầu: JWT token hợp lệ
     */
    @PutMapping("/profile")
    public ResponseEntity<PatientProfileDTO> updateMyProfile(
            @Valid @RequestBody UpdatePatientProfileRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String userId = resolveUserId(userDetails);
        return ResponseEntity.ok(patientProfileService.updatePatientProfile(userId, request));
    }

    /**
     * POST /api/account/patient/auth/email/request-change
     * Yêu cầu thay đổi email — gửi verification code qua email
     */
    @PostMapping("auth/email/request-change")
    public ResponseEntity<String> requestEmailChange(
            @Valid @RequestBody ChangeEmailRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String userId = resolveUserId(userDetails);
        return ResponseEntity.ok(patientProfileService.requestEmailChange(userId, request));
    }

    /**
     * POST /api/account/patient/auth/email/verify-change
     * Xác nhận thay đổi email với verification code
     * Yêu cầu: JWT token hợp lệ + verification code
     */
    @PostMapping("auth/email/verify-change")
    public ResponseEntity<PatientProfileDTO> verifyEmailChange(
            @Valid @RequestBody VerifyEmailChangeRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String userId = resolveUserId(userDetails);
        return ResponseEntity.ok(patientProfileService.verifyEmailChange(userId, request));
    }

    /**
     * PUT /api/account/patient/auth/password/change
     * Đổi mật khẩu khi đã đăng nhập — xác nhận bằng currentPassword trước khi đổi
     */
    @PutMapping("auth/password/change")
    public ResponseEntity<Void> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String userId = resolveUserId(userDetails);
        patientProfileService.changePassword(userId, request);
        return ResponseEntity.ok().build();
    }

    /**
     * POST /api/account/patient/avatar
     * Upload ảnh đại diện — toàn bộ logic xử lý nằm trong PatientProfileService
     */
    @PostMapping("/avatar")
    public ResponseEntity<?> uploadAvatar(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserDetails userDetails) {
        String userId = resolveUserId(userDetails);
        try {
            String avatarUrl = patientProfileService.uploadAvatar(userId, file);
            return ResponseEntity.ok(Map.of("avatarUrl", avatarUrl));
        } catch (IOException e) {
            log.error("Avatar upload failed for patient {}: {}", userId, e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Failed to upload: " + e.getMessage()));
        }
    }
}
