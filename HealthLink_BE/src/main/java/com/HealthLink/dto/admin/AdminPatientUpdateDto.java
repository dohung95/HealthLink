package com.HealthLink.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminPatientUpdateDto {
    private String fullName;
    private LocalDate dateOfBirth;
    private String gender;
    private String status;
    private String address;
    private String city;
    private String country;
    private String bloodType;
    private String occupation;
    private String preferredLanguage;
    private String preferredContactMethod;
    private String emergencyContactName;
    private String emergencyContactPhone;
    private String emergencyContactRelationship;
    private String medicalHistorySummary;
    private String insuranceProvider;
    private String insurancePolicyNumber;

    // New fields from Patient entity
    private String avatarUrl;
    private Double latitude;
    private Double longitude;
    private String allergies;
    private String chronicConditions;
    private String currentMedications;
    private Double heightCm;
    private Double weightKg;
}