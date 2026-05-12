package com.HealthLink.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

/**
 * Request để thay đổi email với xác nhận qua OTP
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChangeEmailRequest {
    
    @Email(message = "Invalid email format")
    @NotBlank(message = "New email is required")
    private String newEmail;
    
    @NotBlank(message = "Current password is required for verification")
    private String password;
}
