package com.HealthLink.dto.registration;

import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PharmacyRegistrationRequest {
    @NotBlank(message = "Pharmacy name is required")
    private String pharmacyName;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Phone number is required")
    private String phoneNumber;

    @NotBlank(message = "License number is required")
    private String licenseNumber;

    @NotBlank(message = "Address is required")
    private String address;

    private String city;
    private String district;
    private String ward;

    private LocalTime openTime;
    private LocalTime closeTime;

    @Builder.Default
    private Boolean open24Hours = false;

    private String workingDays;

    @Builder.Default
    private Boolean deliveryAvailable = false;

    @DecimalMin(value = "0.0", message = "Delivery radius must be non-negative")
    private Double deliveryRadius;

    @DecimalMin(value = "0.0", message = "Delivery fee must be non-negative")
    private BigDecimal deliveryFee;

    private String description;
}
