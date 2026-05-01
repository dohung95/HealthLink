package com.HealthLink.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "Patients")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Patient {

    @Id
    @Column(name = "PatientID", length = 450)
    private String patientId;

    @Column(name = "FullName", nullable = false)
    private String fullName;

    @Column(name = "DateOfBirth")
    private LocalDateTime dateOfBirth;

    @Column(name = "MedicalHistorySummary")
    private String medicalHistorySummary;

    @Column(name = "InsuranceProvider")
    private String insuranceProvider;

    @Column(name = "InsurancePolicyNumber")
    private String insurancePolicyNumber;

    @Column(name = "Gender", length = 10)
    private String gender;

    @Column(name = "Address", length = 255)
    private String address;

    @Column(name = "City", length = 100)
    private String city;

    @Column(name = "Country", length = 100)
    private String country;

    @Column(name = "BloodType", length = 10)
    private String bloodType;

    @Column(name = "EmergencyContactName", length = 100)
    private String emergencyContactName;

    @Column(name = "EmergencyContactPhone", length = 20)
    private String emergencyContactPhone;

    @Column(name = "EmergencyContactRelationship", length = 50)
    private String emergencyContactRelationship;

    @Column(name = "PreferredLanguage", length = 50)
    private String preferredLanguage;

    @Column(name = "PreferredContactMethod", length = 20)
    private String preferredContactMethod;

    @Column(name = "Occupation", length = 100)
    private String occupation;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "PatientID")
    private User user;

    @OneToMany(mappedBy = "patient", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Appointment> appointments = new ArrayList<>();

    @OneToMany(mappedBy = "patient", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Review> reviews = new ArrayList<>();

    @OneToMany(mappedBy = "patient", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<HealthRecord> healthRecords = new ArrayList<>();

    @OneToMany(mappedBy = "patient", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Invoice> invoices = new ArrayList<>();

    @OneToMany(mappedBy = "patient", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<PrescriptionHeader> prescriptionHeaders = new ArrayList<>();
}
