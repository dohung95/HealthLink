package com.HealthLink.dto.auth;

import lombok.*;

/**
 * Response trả về sau khi đăng nhập / refresh token thành công.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoginResponse {

    private String accessToken;
    private String refreshToken;

    /** ID của user trong bảng Users. */
    private String userId;

    private String email;
    private String username;

    /** Tên role của user (ví dụ: "Patient", "Doctor", "Admin"). */
    private String role;
}
