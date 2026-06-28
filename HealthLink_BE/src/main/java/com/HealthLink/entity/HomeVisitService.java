package com.HealthLink.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "HomeVisitServices")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HomeVisitService {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ServiceID")
    private Integer serviceId;

    @Column(name = "ServiceName", nullable = false, length = 255)
    private String serviceName;

    @Column(name = "Description", length = 1000)
    private String description;

    @Column(name = "Price", nullable = false, precision = 18, scale = 2)
    private BigDecimal price;

    @Column(name = "Active", nullable = false)
    @Builder.Default
    private Boolean active = true;

    @Column(name = "DurationMinutes", nullable = false)
    @Builder.Default
    private Integer durationMinutes = 0;
}
