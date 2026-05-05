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
    private User user;

    @Column(name = "FullName", nullable = false)
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
    private List<Appointment> appointments;

    @OneToMany(mappedBy = "patient")
    private List<Review> reviews;

    @OneToMany(mappedBy = "patient")
    private List<HealthRecord> healthRecords;

    @OneToMany(mappedBy = "patient")
    private List<Invoice> invoices;

    @OneToMany(mappedBy = "patient")
    private List<PrescriptionHeader> prescriptionHeaders;

    @OneToMany(mappedBy = "patient")
    private List<VitalSign> vitalSigns;
}