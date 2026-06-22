package com.HealthLink.dto.registration;

import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;

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

    @NotNull(message = "Consultation fee is required")
    @DecimalMin(value = "1.0", message = "Consultation fee must be at least 1.0")
    private BigDecimal consultationFee;

    @NotBlank(message = "Clinic/Hospital name is required")
    private String clinicName;

    @NotBlank(message = "Clinic/Hospital address is required")
    private String clinicAddress;

}
