package com.HealthLink.dto.response;

import com.HealthLink.dto.admin.AdminAppointmentSummaryDto;
import com.HealthLink.dto.admin.AdminDocumentCategoryDto;
import com.HealthLink.dto.admin.AdminMedicalDocumentDto;
import com.HealthLink.dto.prescription.PrescriptionResponse;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class DoctorPatientHistoryResponse {
    private String patientId;
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
    private String medicalHistorySummary;
    private String allergies;
    private String chronicConditions;
    private String currentMedications;
    private Double heightCm;
    private Double weightKg;
    private List<AdminAppointmentSummaryDto> appointments;
    private List<AdminDocumentCategoryDto> documentsByCategory;
    private List<PrescriptionResponse> prescriptions;
    private List<AdminMedicalDocumentDto> clinicalResults;
}
