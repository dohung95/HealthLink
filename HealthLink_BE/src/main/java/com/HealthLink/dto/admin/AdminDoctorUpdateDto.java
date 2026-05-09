package com.HealthLink.dto.admin;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminDoctorUpdateDto {
    @JsonProperty("FullName")
    private String fullName;

    @JsonProperty("PhoneNumber")
    private String phoneNumber;

    @JsonProperty("Specialty")
    private String specialty;

    @JsonProperty("Qualifications")
    private String qualifications;

    @JsonProperty("YearsOfExperience")
    private Integer yearsOfExperience;

    @JsonProperty("LanguageSpoken")
    private String languageSpoken;

    @JsonProperty("Location")
    private String location;

    @JsonProperty("Bio")
    private String bio;

    @JsonProperty("ConsultationFee")
    private BigDecimal consultationFee;

    @JsonProperty("ClinicName")
    private String clinicName;

    @JsonProperty("ClinicAddress")
    private String clinicAddress;

    @JsonProperty("Status")
    private String status;
}
