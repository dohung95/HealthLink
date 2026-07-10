package com.HealthLink.dto.registration;

import jakarta.validation.constraints.*;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DoctorRegistrationRequest {
    @NotBlank(message = "Full name is required")
    private String fullName;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Phone number is required")
    private String phoneNumber;

    @NotBlank(message = "PayPal email is required")
    @Email(message = "Invalid PayPal email format")
    private String paypalEmail;

    @NotBlank(message = "Qualifications are required")
    private String qualifications;

    @NotNull(message = "Specialty ID is required")
    private Integer specialtyId;

    private String specialty;

    @NotNull(message = "Years of experience is required")
    @Min(value = 0, message = "Years of experience must be non-negative")
    private Integer yearsOfExperience;

    @NotBlank(message = "Language spoken is required")
    private String languageSpoken;

    @NotBlank(message = "Location is required")
    private String location;

    private String bio;

    @NotBlank(message = "Clinic/Hospital name is required")
    private String clinicName;

    @NotBlank(message = "Clinic/Hospital address is required")
    private String clinicAddress;

    @NotNull(message = "Clinic location pin is required")
    private Double latitude;

    @NotNull(message = "Clinic location pin is required")
    private Double longitude;

    @DecimalMin(value = "1.0", message = "Home visit service radius must be at least 1km")
    @DecimalMax(value = "25.0", message = "Home visit service radius cannot exceed 25km")
    private Double homeVisitRadiusKm;

}
