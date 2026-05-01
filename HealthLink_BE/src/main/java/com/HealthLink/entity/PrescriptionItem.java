package com.HealthLink.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "PrescriptionItems")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrescriptionItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "PrescriptionItemID")
    private Integer prescriptionItemId;

    @Column(name = "PrescriptionHeaderID", nullable = false)
    private Integer prescriptionHeaderId;

    @Column(name = "MedicationName", nullable = false, length = 200)
    private String medicationName;

    @Column(name = "Dosage", nullable = false, length = 100)
    private String dosage;

    @Column(name = "Instructions", nullable = false, length = 500)
    private String instructions;

    @Column(name = "TotalSupplyDays", nullable = false)
    private Integer totalSupplyDays;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PrescriptionHeaderID", insertable = false, updatable = false)
    private PrescriptionHeader prescriptionHeader;
}
