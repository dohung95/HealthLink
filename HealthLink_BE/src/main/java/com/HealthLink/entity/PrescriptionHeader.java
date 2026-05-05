import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "PrescriptionHeaders")
@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class PrescriptionHeader {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "PrescriptionHeaderID")
    private Integer prescriptionHeaderId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "AppointmentId", nullable = false)
    @ToString.Exclude
    private Appointment appointment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PatientID", nullable = false)
    @ToString.Exclude
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "DoctorID", nullable = false)
    @ToString.Exclude
    private Doctor doctor;

    @Column(nullable = false)
    private LocalDateTime issueDate;

    @Column(length = 1000)
    private String diagnosis;

    @Column(length = 1000)
    private String notes;

    private LocalDateTime validUntil;

    @Column(length = 50)
    private String status;

    private BigDecimal totalAmount;

    @OneToMany(mappedBy = "prescriptionHeader", cascade = CascadeType.ALL, orphanRemoval = true)
    @ToString.Exclude
    private List<PrescriptionItem> prescriptionItems;

    @OneToMany(mappedBy = "prescriptionHeader")
    @ToString.Exclude
    private List<PharmacyOrder> pharmacyOrders;
}