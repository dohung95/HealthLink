package com.HealthLink.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminDoctorDto {
    private String doctorId;
    private String fullName;
    private String email;
    private String phone;
    private String status;
    private String specialty;
    private String qualifications;
    private Integer yearsOfExperience;
    private String languageSpoken;
    private String location;
    private String bio;
    private BigDecimal consultationFee;
    private String clinicName;
    private String clinicAddress;
    private Double rating;
    private Integer totalReviews;
    private Integer totalConsultations;
    private String avatarUrl;
    private boolean verified;
    private Boolean availableForHomeVisit;
    private Double homeVisitRadiusKm;
    private Double latitude;
    private Double longitude;
    private Set<String> services;
    private BigDecimal totalEarnings;
    private BigDecimal pendingSettlement;
    private LocalDateTime createdAt;
}
