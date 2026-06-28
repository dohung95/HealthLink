package com.HealthLink.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.math.BigDecimal;

@Entity
@Table(name = "PharmacyOrderItems")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PharmacyOrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "OrderItemID")
    private Integer orderItemId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "OrderID", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private PharmacyOrder pharmacyOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "MedicineID")
    @ToString.Exclude
    private Medicine medicine;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "SourcePrescriptionHeaderID")
    @ToString.Exclude
    private PrescriptionHeader sourcePrescriptionHeader;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "SourcePrescriptionItemID")
    @ToString.Exclude
    private PrescriptionItem sourcePrescriptionItem;

    @Column(nullable = false, length = 200)
    private String medicationName;

    @Column(nullable = false)
    private Integer totalSupplyDays;

    @Column(nullable = false)
    private Integer quantity;

    @Column(length = 50)
    private String unit;

    @Column(length = 100)
    private String frequency;

    @Column(length = 100)
    private String timing;

    @Column(length = 50)
    private String route;

    private BigDecimal totalPrice;

    @Column(length = 500)
    private String notes;
}
