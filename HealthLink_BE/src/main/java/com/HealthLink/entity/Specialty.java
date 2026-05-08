package com.HealthLink.entity;
import com.fasterxml.jackson.annotation.JsonIgnore;
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

    @Column(name = "Active")
    @Builder.Default
    private Boolean active = true;

    @Column(name = "DisplayOrder")
    private Integer displayOrder;

    @OneToMany(mappedBy = "specialtyEntity")
    @ToString.Exclude
    @JsonIgnore
    private List<Doctor> doctors;
}