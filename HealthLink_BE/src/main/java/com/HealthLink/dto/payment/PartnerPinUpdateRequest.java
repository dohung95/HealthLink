package com.HealthLink.dto.payment;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Data
@NoArgsConstructor
@AllArgsConstructor
@ToString(onlyExplicitlyIncluded = true)
public class PartnerPinUpdateRequest {
    @NotBlank(message = "OTP is required")
    @Pattern(regexp = "\\d{6}", message = "OTP must contain exactly 6 digits")
    private String otp;

    @NotBlank(message = "PIN is required")
    @Pattern(regexp = "\\d{6}", message = "PIN must contain exactly 6 digits")
    private String pin;

    @NotBlank(message = "PIN confirmation is required")
    private String confirmPin;
}
