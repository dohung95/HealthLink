package com.HealthLink.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "Invoices")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "InvoiceID")
    private Integer invoiceId;

    @Column(name = "AppointmentID", nullable = false)
    private Integer appointmentId;

    @Column(name = "PatientID", nullable = false, length = 450)
    private String patientId;

    @Column(name = "Amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(name = "IssueDate", nullable = false)
    private LocalDateTime issueDate;

    @Column(name = "Status", nullable = false)
    private String status;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "AppointmentID", insertable = false, updatable = false)
    private Appointment appointment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PatientID", insertable = false, updatable = false)
    private Patient patient;

    // Status constants
    public static final String STATUS_GENERATED = "Generated";
    public static final String STATUS_PAID = "Paid";
    public static final String STATUS_PENDING = "Pending";
    public static final String STATUS_CANCELLED = "Cancelled";

    @PrePersist
    protected void onCreate() {
        if (issueDate == null) {
            issueDate = LocalDateTime.now();
        }
    }
}
