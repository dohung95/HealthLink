import jakarta.persistence.*;
import lombok.*;
import java.util.List;

@Entity
@Table(name = "Specialties")
@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Specialty {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "SpecialtyID")
    private Integer specialtyId;

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Column(length = 100)
    private String nameEn;

    @Column(length = 500)
    private String description;

    @Column(length = 500)
    private String iconUrl;

    private boolean isActive = true;
    private Integer displayOrder;

    @OneToMany(mappedBy = "specialtyEntity")
    @ToString.Exclude
    private List<Doctor> doctors;
}