package com.HealthLink.dto.admin;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaypalEmailOtpRequest {
    @NotBlank(message = "OTP is required")
    private String otp;

    @NotBlank(message = "Reason is required")
    private String reason;
}
