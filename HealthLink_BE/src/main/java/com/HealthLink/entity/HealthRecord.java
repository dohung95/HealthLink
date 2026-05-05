import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "HealthRecords")
@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class HealthRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "HealthRecordID")
    private Integer healthRecordId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PatientID", nullable = false)
    @ToString.Exclude
    private Patient patient;

    @Column(nullable = false)
    private LocalDateTime lastUpdated;

    @Column(length = 200)
    private String title;

    @Column(length = 1000)
    private String description;

    @Column(length = 50)
    private String recordType;

    private LocalDateTime recordDate;
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "healthRecord", cascade = CascadeType.ALL, orphanRemoval = true)
    @ToString.Exclude
    private List<MedicalDocument> medicalDocuments;

    @OneToMany(mappedBy = "healthRecord")
    @ToString.Exclude
    private List<HealthRecordShare> shares;
}