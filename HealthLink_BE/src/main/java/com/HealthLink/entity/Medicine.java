import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "Medicines")
@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Medicine {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MedicineID")
    private Integer medicineId;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(length = 200)
    private String genericName;

    @Column(length = 200)
    private String brandName;

    @Column(length = 100)
    private String category;

    @Column(length = 50)
    private String dosageForm; // Tablet, Capsule, Syrup...

    @Column(length = 50)
    private String strength;

    @Column(length = 50)
    private String unit;

    @Column(length = 200)
    private String manufacturer;

    @Column(length = 100)
    private String countryOfOrigin;

    @Column(length = 2000)
    private String description;

    @Column(length = 1000)
    private String activeIngredients;

    @Column(length = 2000)
    private String indications;

    @Column(length = 2000)
    private String contraindications;

    @Column(length = 2000)
    private String sideEffects;

    @Column(length = 2000)
    private String precautions;

    @Column(length = 2000)
    private String interactions;

    @Column(length = 500)
    private String storageConditions;

    private boolean prescriptionRequired = true;
    private BigDecimal referencePrice;
    private boolean isActive = true;

    @Column(length = 500)
    private String imageUrl;

    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "medicine")
    @ToString.Exclude
    private List<PrescriptionItem> prescriptionItems;
}