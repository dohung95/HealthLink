package com.HealthLink.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "PrescriptionItems")
@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class PrescriptionItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "PrescriptionItemID")
    private Integer prescriptionItemId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PrescriptionHeaderID", nullable = false)
    @ToString.Exclude
    private PrescriptionHeader prescriptionHeader;

    @Column(nullable = false, length = 200)
    private String medicationName;

    @Column(nullable = false, length = 100)
    private String dosage;

    @Column(nullable = false, length = 500)
    private String instructions;

    @Column(nullable = false)
    private Integer totalSupplyDays;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "MedicineID")
    @ToString.Exclude
    private Medicine medicine;

    private Integer quantity;
    
    @Column(length = 50)
    private String unit;

    @Column(length = 100)
    private String frequency;

    @Column(length = 100)
    private String timing;

    @Column(length = 50)
    private String route;

    private BigDecimal unitPrice;
    private BigDecimal totalPrice;

    @Column(length = 500)
    private String notes;
}