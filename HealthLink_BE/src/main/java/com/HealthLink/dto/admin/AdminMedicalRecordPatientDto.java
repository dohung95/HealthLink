package com.HealthLink.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminMedicalRecordPatientDto {
    private String patientID;
    private String fullName;
    private String email;
    private String phoneNumber;
    private String gender;
    private String bloodType;
    private LocalDateTime dateOfBirth;
    private String avatarUrl;
    private int totalRecords;     // Number of health records
    private int totalDocuments;   // Number of medical documents
    private LocalDateTime lastUpdated;
}
