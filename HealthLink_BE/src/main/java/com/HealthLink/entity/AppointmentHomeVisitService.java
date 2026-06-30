package com.HealthLink.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "AppointmentHomeVisitServices")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppointmentHomeVisitService {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ID")
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "AppointmentID", nullable = false)
    private Appointment appointment;

    @Column(name = "ServiceID", nullable = false)
    private Integer serviceId;

    @Column(name = "ServiceName", nullable = false, length = 255)
    private String serviceName;

    @Column(name = "Price", nullable = false, precision = 18, scale = 2)
    private BigDecimal price;
}