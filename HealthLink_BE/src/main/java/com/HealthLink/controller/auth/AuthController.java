package com.HealthLink.controller.auth;

import com.HealthLink.dto.auth.ForgotPasswordRequest;
import com.HealthLink.dto.auth.LoginRequest;
import com.HealthLink.dto.auth.LoginResponse;
import com.HealthLink.dto.auth.RefreshTokenRequest;
import com.HealthLink.dto.auth.RegisterRequest;
import com.HealthLink.dto.auth.ResetPasswordRequest;
import com.HealthLink.service.auth.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Controller xử lý đăng nhập, đăng ký và refresh token.
 * Tất cả endpoint dưới /api/auth/** là PUBLIC (không cần JWT).
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * POST /api/auth/login
     * Đăng nhập bằng email + password, trả về accessToken + refreshToken.
     */
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(
            @Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    /**
     * POST /api/auth/register
     * Đăng ký tài khoản mới.
     */
    @PostMapping("/register")
    public ResponseEntity<LoginResponse> register(
            @Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    /**
     * POST /api/auth/refresh
     * Dùng refresh token để lấy access token mới (token rotation).
     */
    @PostMapping("/refresh")
    public ResponseEntity<LoginResponse> refresh(
            @Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(authService.refreshToken(request));
    }

    /**
     * POST /api/auth/forgot-password
     * Gửi email chứa link đặt lại mật khẩu (PUBLIC - không cần JWT).
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        // Luôn trả về thông báo chung để tránh lộ thông tin email tồn tại hay không
        return ResponseEntity.ok(Map.of("message",
                "If that email is registered, a reset link has been sent."));
    }

    /**
     * POST /api/auth/reset-password
     * Xác thực token và đặt lại mật khẩu mới (PUBLIC - không cần JWT).
     */
    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(Map.of("message", "Password has been reset successfully."));
    }
}
