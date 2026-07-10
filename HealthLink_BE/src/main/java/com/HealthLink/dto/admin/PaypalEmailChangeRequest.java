package com.HealthLink.dto.admin;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaypalEmailChangeRequest {
    @NotBlank(message = "New PayPal email is required")
    @Email(message = "Invalid PayPal email format")
    private String newPaypalEmail;

    @NotBlank(message = "Reason is required")
    private String reason;
}
