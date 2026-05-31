package com.HealthLink.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "Patients")
@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Patient {
    @Id
    @Column(name = "PatientID", length = 450)
    private String patientId;

    @OneToOne
    @MapsId
    @JoinColumn(name = "PatientID")
    @ToString.Exclude
    private User user;

    @Column(name = "FullName", nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String fullName;

    private LocalDateTime dateOfBirth;
    
    @Column(columnDefinition = "TEXT")
    private String medicalHistorySummary;
    
    private String insuranceProvider;
    private String insurancePolicyNumber;
    
    @Column(length = 10)
    private String gender;
    
    private String address;
    private String city;
    private String country;
    
    @Column(length = 10)
    private String bloodType;
    
    private String emergencyContactName;
    private String emergencyContactPhone;
    private String emergencyContactRelationship;
    private String preferredLanguage;
    private String preferredContactMethod;
    private String occupation;
    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String avatarUrl;
    private Double latitude;
    private Double longitude;
    
    @Column(length = 1000)
    private String allergies;
    
    @Column(length = 1000)
    private String chronicConditions;
    
    @Column(length = 1000)
    private String currentMedications;
    
    private Double heightCm;
    private Double weightKg;

    // --- Relationships ---
    @OneToMany(mappedBy = "patient")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<Appointment> appointments;

    @OneToMany(mappedBy = "patient")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<Review> reviews;

    @OneToMany(mappedBy = "patient")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<HealthRecord> healthRecords;

    @OneToMany(mappedBy = "patient")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<Invoice> invoices;

    @OneToMany(mappedBy = "patient")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<PrescriptionHeader> prescriptionHeaders;

    @OneToMany(mappedBy = "patient")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<PharmacyConsultationRequest> pharmacyConsultationRequests;

    @OneToMany(mappedBy = "patient")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<VitalSign> vitalSigns;
}
