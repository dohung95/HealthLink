package com.HealthLink.controller;

import com.HealthLink.dto.auth.LoginRequest;
import com.HealthLink.dto.auth.LoginResponse;
import com.HealthLink.dto.auth.RefreshTokenRequest;
import com.HealthLink.dto.auth.RegisterRequest;
import com.HealthLink.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
}
