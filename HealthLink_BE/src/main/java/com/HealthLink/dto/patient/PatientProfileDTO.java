package com.HealthLink.dto.patient;

import lombok.*;
import java.time.LocalDateTime;

/**
 * DTO chứa toàn bộ thông tin profile của patient
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PatientProfileDTO {
    // User info
    private String userId;
    private String email;
    private String phoneNumber;
    private LocalDateTime createdDate;

    // Patient info
    private String fullName;
    private LocalDateTime dateOfBirth;
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
    private String status;
    private String avatarUrl;
    private String allergies;
    private String chronicConditions;
    private String currentMedications;
    private Double heightCm;
    private Double weightKg;
    private Double latitude;
    private Double longitude;
}
