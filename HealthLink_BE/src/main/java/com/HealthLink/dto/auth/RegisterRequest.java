package com.HealthLink.dto.auth;

import jakarta.validation.constraints.*;
import lombok.*;

/**
 * Request đăng ký tài khoản mới.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {

    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    private String username;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^\\d{9,15}$", message = "Invalid phone number format")
    private String phoneNumber;

    /**
     * Role mặc định sẽ là "Patient" nếu không truyền.
     * Các giá trị hợp lệ: "Patient", "Doctor", "Pharmacy".
     */
    private String role;
}
