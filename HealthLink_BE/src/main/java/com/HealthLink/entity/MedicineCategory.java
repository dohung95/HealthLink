package com.HealthLink.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "MedicineCategories", uniqueConstraints = {
        @UniqueConstraint(columnNames = "code"),
        @UniqueConstraint(columnNames = "slug")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicineCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "CategoryID")
    private Integer categoryId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ParentCategoryID")
    @ToString.Exclude
    private MedicineCategory parent;

    @OneToMany(mappedBy = "parent")
    @OrderBy("sortOrder ASC, name ASC")
    @Builder.Default
    @ToString.Exclude
    private List<MedicineCategory> children = new ArrayList<>();

    @Column(nullable = false, length = 80)
    private String code;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, length = 140)
    private String slug;

    @Column(length = 50)
    private String icon;

    @Builder.Default
    @Column(nullable = false)
    private Integer sortOrder = 0;

    @Builder.Default
    @Column(nullable = false)
    private Boolean active = true;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (updatedAt == null) updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
