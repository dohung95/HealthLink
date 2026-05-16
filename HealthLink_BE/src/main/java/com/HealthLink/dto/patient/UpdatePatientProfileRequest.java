package com.HealthLink.dto.patient;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Request body để update thông tin patient
 * Email được handle riêng thông qua endpoint xác nhận
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class UpdatePatientProfileRequest {
    
    @NotBlank(message = "Full name is required")
    private String fullName;
    
    private LocalDate dateOfBirth;
    private String medicalHistorySummary;
    private String insuranceProvider;
    private String insurancePolicyNumber;
    private String gender;
    private String address;
    private String city;
    private String country;
    private String bloodType;
    private String emergencyContactName;
    private String emergencyContactPhone;
    private String emergencyContactRelationship;
    private String preferredLanguage;
    private String preferredContactMethod;
    private String occupation;
    private String username;
    private String phoneNumber;
    private String avatarUrl;
    private String allergies;
    private String chronicConditions;
    private String currentMedications;
    private Double heightCm;
    private Double weightKg;
    private Double latitude;
    private Double longitude;
}
