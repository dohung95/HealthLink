package com.HealthLink.dto.patient;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

/**
 * Request để xác nhận email mới
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VerifyEmailChangeRequest {
    
    @Email(message = "Invalid email format")
    @NotBlank(message = "New email is required")
    private String newEmail;
    
    @NotBlank(message = "Verification code is required")
    private String verificationCode;
}
