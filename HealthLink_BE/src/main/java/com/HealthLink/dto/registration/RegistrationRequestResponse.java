package com.HealthLink.dto.registration;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegistrationRequestResponse {
    private Long requestId;
    private String registrationType;
    private String email;
    private String phoneNumber;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime reviewedAt;
    private String reviewedBy;
    private String rejectionReason;

    // Doctor fields
    private String fullName;
    private String qualifications;
    private Integer specialtyId;
    private String specialty;
    private Integer yearsOfExperience;
    private String languageSpoken;
    private String location;
    private String bio;
    private BigDecimal consultationFee;
    private String clinicName;
    private String clinicAddress;
    private Boolean availableForVideo;
    private Boolean availableForAudio;
    private Boolean availableForChat;
    private Boolean availableForOffline;

    // Pharmacy fields
    private String pharmacyName;
    private String licenseNumber;
    private String address;
    private String city;
    private String district;
    private String ward;
    private LocalTime openTime;
    private LocalTime closeTime;
    private Boolean open24Hours;
    private String workingDays;
    private Boolean deliveryAvailable;
    private Double deliveryRadius;
    private BigDecimal deliveryFee;
    private String description;

    // Documents
    private List<RegistrationDocumentDto> documents;
}
