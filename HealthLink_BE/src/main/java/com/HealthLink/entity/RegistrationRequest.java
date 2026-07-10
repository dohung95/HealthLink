package com.HealthLink.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Nationalized;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Entity
@Table(name = "RegistrationRequests")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegistrationRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "RequestID")
    private Long requestId;

    @Column(name = "RegistrationType", nullable = false, length = 20)
    private String registrationType; // DOCTOR or PHARMACY

    @Column(name = "Email", nullable = false, length = 256)
    private String email;

    @Column(name = "PhoneNumber", length = 20)
    private String phoneNumber;

    @Column(name = "Status", nullable = false, length = 20)
    @Builder.Default
    private String status = "Pending"; // Pending, Approved, Rejected

    @Column(name = "CreatedAt")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "ReviewedAt")
    private LocalDateTime reviewedAt;

    @Column(name = "ReviewedBy", length = 450)
    private String reviewedBy;

    @Nationalized
    @Column(name = "RejectionReason", length = 1000)
    private String rejectionReason;

    @Column(name = "PaypalEmail", length = 255)
    private String paypalEmail;

    // ============ Doctor Fields ============
    @Nationalized
    @Column(name = "FullName", length = 200)
    private String fullName;

    @Nationalized
    @Column(name = "Qualifications", length = 500)
    private String qualifications;

    @Column(name = "SpecialtyId")
    private Integer specialtyId;

    @Nationalized
    @Column(name = "Specialty", length = 100)
    private String specialty;

    @Column(name = "YearsOfExperience")
    private Integer yearsOfExperience;

    @Nationalized
    @Column(name = "LanguageSpoken", length = 200)
    private String languageSpoken;

    @Nationalized
    @Column(name = "Location", length = 500)
    private String location;

    @Nationalized
    @Column(name = "Bio", length = 2000)
    private String bio;

    @Column(name = "ConsultationFee")
    private BigDecimal consultationFee;

    @Nationalized
    @Column(name = "ClinicName", length = 200)
    private String clinicName;

    @Nationalized
    @Column(name = "ClinicAddress", length = 500)
    private String clinicAddress;

    @Column(name = "Latitude")
    private Double latitude;

    @Column(name = "Longitude")
    private Double longitude;

    @Column(name = "HomeVisitRadiusKm")
    private Double homeVisitRadiusKm;

    // ============ Pharmacy Fields ============
    @Nationalized
    @Column(name = "PharmacyName", length = 200)
    private String pharmacyName;

    @Column(name = "LicenseNumber", length = 100)
    private String licenseNumber;

    @Nationalized
    @Column(name = "Address", length = 500)
    private String address;

    @Nationalized
    @Column(name = "City", length = 100)
    private String city;

    @Nationalized
    @Column(name = "District", length = 100)
    private String district;

    @Nationalized
    @Column(name = "Ward", length = 100)
    private String ward;

    @Column(name = "OpenTime")
    private LocalTime openTime;

    @Column(name = "CloseTime")
    private LocalTime closeTime;

    @Column(name = "Open24Hours")
    @Builder.Default
    private Boolean open24Hours = false;

    @Column(name = "WorkingDays", length = 50)
    private String workingDays;

    @Column(name = "DeliveryAvailable")
    @Builder.Default
    private Boolean deliveryAvailable = false;

    @Column(name = "DeliveryRadius")
    private Double deliveryRadius;

    @Column(name = "DeliveryFee")
    private BigDecimal deliveryFee;

    @Nationalized
    @Column(name = "Description", length = 1000)
    private String description;

    // ============ AI Screening Fields ============
    @Column(name = "AIScreeningStatus", length = 20)
    @Builder.Default
    private String aiScreeningStatus = "PENDING"; // PENDING, PROCESSING, PASSED, FLAGGED, REJECTED

    @Column(name = "AIScreeningResult", columnDefinition = "NVARCHAR(MAX)")
    private String aiScreeningResult;

    @Nationalized
    @Column(name = "AIRejectionReason", length = 500)
    private String aiRejectionReason;

    @Column(name = "AIScreenedAt")
    private LocalDateTime aiScreenedAt;

    // ============ Documents Relationship ============
    @OneToMany(mappedBy = "registrationRequest", cascade = CascadeType.ALL, orphanRemoval = true)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<RegistrationDocument> documents;
}
