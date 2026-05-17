package com.HealthLink.service.auth;

import com.HealthLink.dto.auth.ForgotPasswordRequest;
import com.HealthLink.dto.auth.LoginRequest;
import com.HealthLink.dto.auth.LoginResponse;
import com.HealthLink.dto.auth.RefreshTokenRequest;
import com.HealthLink.dto.auth.RegisterRequest;
import com.HealthLink.dto.auth.ResetPasswordRequest;

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

    /**
     * Gửi email chứa link đặt lại mật khẩu tới địa chỉ email của user.
     */
    void forgotPassword(ForgotPasswordRequest request);

    /**
     * Xác thực token và cập nhật mật khẩu mới.
     */
    void resetPassword(ResetPasswordRequest request);

    /**
     * Logout bảo mật:
     *  - Đưa access token vào blacklist.
     *  - Revoke toàn bộ refresh token của user trong DB.
     *
     * @param accessToken chuỗi JWT đầy đủ (không bao gồm "Bearer ")
     */
    void logout(String accessToken);

    /**
     * Xác nhận email sau đăng ký thông qua token trong link email.
     */
    void confirmEmail(String token);
}
