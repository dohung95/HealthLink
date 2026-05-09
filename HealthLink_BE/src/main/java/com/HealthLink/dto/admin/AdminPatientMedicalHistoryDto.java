package com.HealthLink.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminPatientMedicalHistoryDto {
    // Patient basic info
    private String patientID;
    private String fullName;
    private String email;
    private String phoneNumber;
    private String gender;
    private String bloodType;
    private LocalDateTime dateOfBirth;
    private String avatarUrl;
    private String address;
    private String city;
    private String country;

    // Medical info
    private String medicalHistorySummary;
    private String allergies;
    private String chronicConditions;
    private String currentMedications;
    private Double heightCm;
    private Double weightKg;

    // Insurance info
    private String insuranceProvider;
    private String insurancePolicyNumber;

    // Emergency contact
    private String emergencyContactName;
    private String emergencyContactPhone;
    private String emergencyContactRelationship;

    // Appointments
    private List<AdminAppointmentSummaryDto> appointments;

    // Documents by category
    private List<AdminDocumentCategoryDto> documentsByCategory;
}
