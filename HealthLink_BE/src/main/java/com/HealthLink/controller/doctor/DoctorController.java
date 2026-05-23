package com.HealthLink.controller.doctor;

import com.HealthLink.dto.doctor.DoctorUpdateRequest;
import com.HealthLink.dto.auth.ChangeEmailRequest;
import com.HealthLink.dto.auth.VerifyEmailChangeRequest;
import com.HealthLink.dto.response.DoctorProfileResponse;
import com.HealthLink.dto.response.DoctorResponse;
import com.HealthLink.dto.response.DoctorScheduleResponse;
import com.HealthLink.repository.auth.UserRepository;
import com.HealthLink.service.doctor.DoctorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import com.HealthLink.dto.response.PagedResponse;
import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/account/doctors")
@RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
public class DoctorController {

    private final DoctorService doctorService;
    private final UserRepository userRepository;

    private String resolveUserId(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found for email: " + userDetails.getUsername()))
                .getId();
    }

    // Lấy danh sách bác sĩ, hỗ trợ lọc theo chuyên khoa và tên
    @GetMapping
    public ResponseEntity<List<DoctorResponse>> getAllDoctors(
            @RequestParam(required = false) String specialty,
            @RequestParam(required = false) String name) {
        return ResponseEntity.ok(doctorService.getAllDoctors(specialty, name));
    }

    // Lấy lịch làm việc của một bác sĩ.
    @GetMapping("/{doctorId}/schedules")
    public ResponseEntity<List<DoctorScheduleResponse>> getDoctorSchedules(
            @PathVariable String doctorId) {
        return ResponseEntity.ok(doctorService.getDoctorSchedules(doctorId));
    }

    // Hiển thị hồ sơ bác sĩ theo doctorId.
    @GetMapping("/{doctorId}")
    public ResponseEntity<DoctorProfileResponse> getDoctorProfile(@PathVariable String doctorId) {
        return ResponseEntity.ok(doctorService.getDoctorProfile(doctorId));
    }

    // Hiển thị hồ sơ của chính bác sĩ đang đăng nhập.
    @GetMapping("/profile")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<DoctorProfileResponse> getMyProfile(
            @AuthenticationPrincipal UserDetails userDetails) {
        String doctorId = resolveUserId(userDetails);
        return ResponseEntity.ok(doctorService.getDoctorProfile(doctorId));
    }

    // Cập nhật thông tin bác sĩ do chính bác sĩ quản lý.
    @PutMapping("/profile")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<DoctorProfileResponse> updateMyProfile(
            @Valid @RequestBody DoctorUpdateRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String doctorId = resolveUserId(userDetails);
        DoctorProfileResponse updated = doctorService.updateDoctorProfile(doctorId, request);
        return ResponseEntity.ok(updated);
    }

    // Yêu cầu đổi email - gửi mã xác nhận về email mới
    @PostMapping("auth/email/request-change")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<String> requestEmailChange(
            @Valid @RequestBody ChangeEmailRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String doctorId = resolveUserId(userDetails);
        String message = doctorService.requestEmailChange(doctorId, request);
        return ResponseEntity.ok(message);
    }

    // Xác nhận đổi email với mã xác nhận
    @PostMapping("auth/email/verify-change")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<DoctorProfileResponse> verifyEmailChange(
            @Valid @RequestBody VerifyEmailChangeRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String doctorId = resolveUserId(userDetails);
        DoctorProfileResponse updated = doctorService.verifyEmailChange(doctorId, request);
        return ResponseEntity.ok(updated);
    }

    // Upload ảnh đại diện cho bác sĩ
    @PostMapping("/avatar")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<?> uploadAvatar(
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            @AuthenticationPrincipal UserDetails userDetails) {
        String doctorId = resolveUserId(userDetails);
        try {
            String avatarUrl = doctorService.uploadAvatar(doctorId, file);
            return ResponseEntity.ok(Map.of("avatarUrl", avatarUrl));
        } catch (IOException e) {
            log.error("Avatar upload failed for doctor {}: {}", doctorId, e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Failed to upload: " + e.getMessage()));
        }
    }

    @GetMapping("/search")
    public ResponseEntity<PagedResponse<DoctorResponse>> searchDoctors(
            @RequestParam(required = false) String specialty,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String location,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "5") int pageSize
    ) {
        return ResponseEntity.ok(
                doctorService.searchDoctors(
                        specialty,
                        name,
                        location,
                        page,
                        pageSize
                )
        );
    }

    @GetMapping("/specialties")
    public ResponseEntity<List<String>> getSpecialties() {
        return ResponseEntity.ok(doctorService.getSpecialties());
    }
}
