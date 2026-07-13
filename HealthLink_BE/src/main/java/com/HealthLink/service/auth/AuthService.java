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
     *
     * @param request   thông tin đăng nhập (email + password)
     * @param userAgent chuỗi User-Agent từ HTTP header (để ghi nhận tên thiết bị)
     * @param ipAddress địa chỉ IP của client
     */
    LoginResponse login(LoginRequest request, String userAgent, String ipAddress);

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

    /**
     * Xác nhận PayPal email sau khi đăng ký được duyệt, thông qua token trong link email.
     */
    void confirmPaypalEmail(String token);
}
