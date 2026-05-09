package com.HealthLink.dto.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

/**
 * Request gửi refresh token để lấy access token mới.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RefreshTokenRequest {

    @NotBlank(message = "Refresh token is required")
    private String refreshToken;
}
