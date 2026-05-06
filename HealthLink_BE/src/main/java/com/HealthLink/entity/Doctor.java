package com.HealthLink.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.List;

@Entity
@Table(name = "Doctors")
@Getter @Setter
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
    private boolean verified;
    private boolean availableForVideo;
    private boolean availableForAudio;
    private boolean availableForChat;
    private boolean availableForOffline;

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