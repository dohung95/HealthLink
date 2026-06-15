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
    @JsonProperty("fullName")
    private String fullName;

    @JsonProperty("phoneNumber")
    private String phoneNumber;

    @JsonProperty("specialty")
    private String specialty;

    @JsonProperty("qualifications")
    private String qualifications;

    @JsonProperty("yearsOfExperience")
    private Integer yearsOfExperience;

    @JsonProperty("languageSpoken")
    private String languageSpoken;

    @JsonProperty("location")
    private String location;

    @JsonProperty("bio")
    private String bio;

    @JsonProperty("consultationFee")
    private BigDecimal consultationFee;

    @JsonProperty("clinicName")
    private String clinicName;

    @JsonProperty("clinicAddress")
    private String clinicAddress;

    @JsonProperty("status")
    private String status;
}
