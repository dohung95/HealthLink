package com.HealthLink.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "Appointments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Appointment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "AppointmentID")
    private Integer appointmentId;

    @Column(name = "AppointmentTime", nullable = false)
    private LocalDateTime appointmentTime;

    @Column(name = "ConsultationType", nullable = false)
    private String consultationType;

    @Column(name = "Status")
    @Builder.Default
    private String status = "SCHEDULED";

    @Column(length = 2000)
    private String symptoms;

    @Column(length = 1000)
    private String notes;

    private BigDecimal fee;
    private LocalDateTime endTime;
    private String cancelReason;
    private String cancelledBy;
    private LocalDateTime cancelledAt;
    private Integer rescheduledFrom;
    private Integer followUpSourceAppointmentId;

    @Builder.Default
    private boolean reminderSent = false;

    @Builder.Default
    private Boolean doctorReminderSent = false;
    
    private LocalDateTime confirmedAt;

    // --- Relationships ---
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PatientID", nullable = false)
    @ToString.Exclude
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "DoctorID", nullable = false)
    @ToString.Exclude
    private Doctor doctor;

    @OneToOne(mappedBy = "appointment")
    @ToString.Exclude
    private Consultation consultation;

    @OneToOne(mappedBy = "appointment")
    @ToString.Exclude
    private Invoice invoice;

    @OneToMany(mappedBy = "appointment")
    @ToString.Exclude
    private List<PrescriptionHeader> prescriptionHeaders;
}
