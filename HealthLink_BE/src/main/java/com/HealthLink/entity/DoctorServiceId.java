package com.HealthLink.entity;

import com.HealthLink.entity.enums.ServiceType;
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
    private String doctorId;

    @Enumerated(EnumType.STRING)
    private ServiceType serviceType;
}
