package com.HealthLink.service.auth;

import com.HealthLink.dto.auth.LoginRequest;
import com.HealthLink.dto.auth.LoginResponse;
import com.HealthLink.dto.auth.RefreshTokenRequest;
import com.HealthLink.dto.auth.RegisterRequest;

public interface AuthService {

    /**
     * Đăng nhập bằng email + password, trả về access token và refresh token.
     */
    LoginResponse login(LoginRequest request);

    /**
     * Đăng ký tài khoản mới.
     */
    LoginResponse register(RegisterRequest request);

    /**
     * Dùng refresh token để lấy access token mới.
     */
    LoginResponse refreshToken(RefreshTokenRequest request);
}
