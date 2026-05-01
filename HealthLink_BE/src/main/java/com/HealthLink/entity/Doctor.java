package com.HealthLink.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "Doctors")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Doctor {

    @Id
    @Column(name = "DoctorID", length = 450)
    private String doctorId;

    @Column(name = "FullName", nullable = false)
    private String fullName;

    @Column(name = "Qualifications", nullable = false)
    private String qualifications;

    @Column(name = "Specialty", nullable = false)
    private String specialty;

    @Column(name = "YearsOfExperience")
    private Integer yearsOfExperience;

    @Column(name = "LanguageSpoken", nullable = false)
    private String languageSpoken;

    @Column(name = "Location", nullable = false)
    private String location;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "DoctorID")
    private User user;

    @OneToMany(mappedBy = "doctor", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Appointment> appointments = new ArrayList<>();

    @OneToMany(mappedBy = "doctor", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Review> reviews = new ArrayList<>();

    @OneToMany(mappedBy = "sharedWithDoctor", fetch = FetchType.LAZY)
    @Builder.Default
    private List<HealthRecordShare> sharedRecords = new ArrayList<>();
}
