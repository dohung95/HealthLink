package com.HealthLink.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "Invoices")
@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Invoice {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "InvoiceID")
    private Integer invoiceId;

    @OneToOne
    @JoinColumn(name = "AppointmentId", nullable = true)
    @ToString.Exclude
    private Appointment appointment;

    @OneToOne
    @JoinColumn(name = "PharmacyOrderId")
    @ToString.Exclude
    private PharmacyOrder pharmacyOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PatientID", nullable = false)
    @ToString.Exclude
    private Patient patient;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false)
    private LocalDateTime issueDate;

    @Column(nullable = false)
    private String status;

    @Column(unique = true, length = 50)
    private String invoiceNumber;

    private BigDecimal consultationFee;
    private BigDecimal medicineFee;
    private BigDecimal deliveryFee;
    private BigDecimal discount;
    private BigDecimal tax;
    private LocalDateTime dueDate;
    private LocalDateTime paidAt;

    @Column(length = 500)
    private String notes;

    // Commission fields
    @Column(precision = 18, scale = 2)
    private BigDecimal platformFee;

    @Column(precision = 18, scale = 2)
    private BigDecimal doctorEarning;

    @Column(precision = 5, scale = 4)
    private BigDecimal commissionRate;

    @OneToMany(mappedBy = "invoice")
    @ToString.Exclude
    private List<Payment> payments;
}