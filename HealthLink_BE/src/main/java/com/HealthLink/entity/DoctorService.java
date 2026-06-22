package com.HealthLink.entity;

import com.HealthLink.entity.enums.ServiceType;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "doctor_services")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DoctorService {

    @EmbeddedId
    private DoctorServiceId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("doctorId")
    @JoinColumn(name = "doctor_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Doctor doctor;

    @Builder.Default
    private boolean available = true;

    public DoctorService(Doctor doctor, ServiceType type, boolean available) {
        this.id = new DoctorServiceId(doctor.getDoctorId(), type);
        this.doctor = doctor;
        this.available = available;
    }
}
