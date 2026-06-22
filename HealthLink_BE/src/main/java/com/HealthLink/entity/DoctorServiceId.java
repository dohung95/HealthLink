package com.HealthLink.entity;

import com.HealthLink.entity.enums.ServiceType;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DoctorServiceId {
    private String doctorId;

    @Enumerated(EnumType.STRING)
    private ServiceType serviceType;
}
