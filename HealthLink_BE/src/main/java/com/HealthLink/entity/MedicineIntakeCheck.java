package com.HealthLink.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "MedicineIntakeChecks",
        uniqueConstraints = @UniqueConstraint(
                name = "UQ_MedicineIntakeChecks_Patient_Item_Date_Timing",
                columnNames = {"PatientID", "PrescriptionItemID", "IntakeDate", "Timing"}
        )
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicineIntakeCheck {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "CheckID")
    private Integer checkId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PatientID", nullable = false)
    @ToString.Exclude
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PrescriptionHeaderID", nullable = false)
    @ToString.Exclude
    private PrescriptionHeader prescriptionHeader;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PrescriptionItemID", nullable = false)
    @ToString.Exclude
    private PrescriptionItem prescriptionItem;

    @Column(name = "IntakeDate", nullable = false)
    private LocalDate intakeDate;

    @Column(name = "Timing", nullable = false, length = 20)
    private String timing;

    @Column(name = "Checked", nullable = false)
    @Builder.Default
    private Boolean checked = false;

    @Column(name = "CheckedAt")
    private LocalDateTime checkedAt;

    @Column(name = "CreatedAt", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "UpdatedAt", nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
