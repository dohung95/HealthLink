package com.HealthLink.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "VitalSigns")
@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class VitalSign {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "VitalSignID")
    private Integer vitalSignId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PatientID", nullable = false)
    @ToString.Exclude
    private Patient patient;

    private Integer heartRate;
    private Integer bloodPressureSystolic;
    private Integer bloodPressureDiastolic;
    private Double temperature;
    private Integer oxygenSaturation;
    private Integer respiratoryRate;
    private Double bloodGlucose;
    private Double weight;
    private Double height;
    private Double bmi;

    @Column(length = 500)
    private String notes;

    @Column(nullable = false)
    private LocalDateTime measuredAt;

    @Column(length = 50)
    private String source; // Manual, Device, Camera

    @Column(length = 100)
    private String deviceName;

    private LocalDateTime createdAt = LocalDateTime.now();
}