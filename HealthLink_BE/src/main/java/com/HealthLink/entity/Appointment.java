package com.HealthLink.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
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

    @Column(name = "PatientID", nullable = false, length = 450)
    private String patientId;

    @Column(name = "DoctorID", nullable = false, length = 450)
    private String doctorId;

    @Column(name = "AppointmentTime", nullable = false)
    private LocalDateTime appointmentTime;

    @Column(name = "ConsultationType", nullable = false)
    private String consultationType;

    @Column(name = "Status", nullable = false)
    @Builder.Default
    private String status = "Scheduled";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PatientID", insertable = false, updatable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "DoctorID", insertable = false, updatable = false)
    private Doctor doctor;

    @OneToOne(mappedBy = "appointment", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Consultation consultation;

    @OneToOne(mappedBy = "appointment", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Invoice invoice;

    @OneToMany(mappedBy = "appointment", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<PrescriptionHeader> prescriptionHeaders = new ArrayList<>();

    // Status constants
    public static final String STATUS_SCHEDULED = "Scheduled";
    public static final String STATUS_CONFIRMED = "Confirmed";
    public static final String STATUS_COMPLETED = "Completed";
    public static final String STATUS_CANCELLED = "Cancelled";
    public static final String STATUS_RESCHEDULED = "Rescheduled";

    // Consultation type constants
    public static final String TYPE_VIDEO_CALL = "Video Call";
    public static final String TYPE_CHAT = "Chat";
}
