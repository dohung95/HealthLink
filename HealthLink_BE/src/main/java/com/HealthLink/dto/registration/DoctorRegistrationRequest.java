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

    @Min(value = 0, message = "Years of experience must be non-negative")
    private Integer yearsOfExperience;

    @NotBlank(message = "Language spoken is required")
    private String languageSpoken;

    @NotBlank(message = "Location is required")
    private String location;

    private String bio;

    @DecimalMin(value = "0.0", message = "Consultation fee must be non-negative")
    private BigDecimal consultationFee;

    private String clinicName;
    private String clinicAddress;

    @Builder.Default
    private Boolean availableForVideo = true;
    @Builder.Default
    private Boolean availableForAudio = true;
    @Builder.Default
    private Boolean availableForChat = true;
    @Builder.Default
    private Boolean availableForOffline = true;
}
