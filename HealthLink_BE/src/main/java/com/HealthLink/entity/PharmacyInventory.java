package com.HealthLink.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "PharmacyInventory", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"PharmacyID", "MedicineID"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PharmacyInventory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "InventoryID")
    private Integer inventoryId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PharmacyID", nullable = false)
    @ToString.Exclude
    private Pharmacy pharmacy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "MedicineID", nullable = false)
    @ToString.Exclude
    private Medicine medicine;

    @Column(nullable = false)
    private Integer quantity;

    @Builder.Default
    @Column(nullable = false)
    private Integer reservedQuantity = 0;

    @Column(length = 50)
    private String unit;

    private LocalDate expiryDate;

    @Column(name = "MinStockLevel")
    private Integer minStockLevel;

    @Builder.Default
    @Column(nullable = false)
    private Boolean active = true;

    private LocalDateTime lastImportedAt;

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

    public int getAvailableQuantity() {
        return quantity - reservedQuantity;
    }
}
