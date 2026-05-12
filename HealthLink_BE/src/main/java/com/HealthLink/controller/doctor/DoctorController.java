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

import java.util.List;

@RestController
@RequestMapping("/api/doctors")
@RequiredArgsConstructor
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
}
