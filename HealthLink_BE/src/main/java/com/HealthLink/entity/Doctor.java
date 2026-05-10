package com.HealthLink.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.List;

@Entity
@Table(name = "Doctors")
@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Doctor {
    @Id
    @Column(name = "DoctorID", length = 450)
    private String doctorId;

    @OneToOne
    @MapsId
    @JoinColumn(name = "DoctorID")
    private User user;

    @Column(name = "FullName", nullable = false)
    private String fullName;

    @Column(nullable = false)
    private String qualifications;

    @Column(nullable = false)
    private String specialty;

    private Integer yearsOfExperience;
    
    @Column(nullable = false)
    private String languageSpoken;
    
    @Column(nullable = false)
    private String location;

    private String avatarUrl;
    
    @Column(length = 2000)
    private String bio;
    
    private BigDecimal consultationFee;
    private Double latitude;
    private Double longitude;
    private String clinicName;
    private String clinicAddress;
    private Double averageRating;
    private Integer totalReviews;
  
    @Builder.Default
    private boolean verified = false;
    
    @Builder.Default
    private boolean availableForVideo = true;
    
    @Builder.Default
    private boolean availableForAudio = true;
    
    @Builder.Default
    private boolean availableForChat = true;
    
    @Builder.Default
    private boolean availableForOffline = true;

    // Commission fields
    @Column(precision = 5, scale = 4)
    private BigDecimal customCommissionRate;

    @Column(length = 20)
    @Builder.Default
    private String commissionTier = "STANDARD";  // STANDARD, PREMIUM, VIP

    @Column(precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal totalEarnings = java.math.BigDecimal.ZERO;

    @Column(precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal pendingSettlement = java.math.BigDecimal.ZERO;

    @Column(length = 50)
    private String bankAccount;

    @Column(length = 100)
    private String bankName;

    @Column(length = 255)
    private String paypalEmail;

    // --- Relationships ---
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "specialtyId")
    private Specialty specialtyEntity;

    @OneToMany(mappedBy = "doctor")
    private List<Appointment> appointments;

    @OneToMany(mappedBy = "doctor")
    private List<Review> reviews;

    @OneToMany(mappedBy = "sharedWithDoctor")
    private List<HealthRecordShare> sharedRecords;

    @OneToMany(mappedBy = "doctor")
    private List<DoctorSchedule> schedules;
}