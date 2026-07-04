package com.HealthLink.entity;

import com.HealthLink.entity.enums.ServiceType;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serial;
import java.io.Serializable;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DoctorServiceId implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;
    @Column(name = "doctor_id", length = 450, nullable = false, columnDefinition = "VARCHAR(450)")
    private String doctorId;

    @Enumerated(EnumType.STRING)
    @Column(name = "service_type")
    private ServiceType serviceType;
}
