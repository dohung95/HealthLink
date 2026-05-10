package com.HealthLink.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "CommissionConfigs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommissionConfig {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ConfigId")
    private Integer configId;

    @Column(nullable = false, unique = true, length = 50)
    private String serviceType;  // CONSULTATION_ONLINE, CONSULTATION_OFFLINE, PHARMACY_ORDER

    @Column(nullable = false, precision = 5, scale = 4)
    private BigDecimal commissionRate;  // 0.1500 = 15%

    @Column(precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal minCommission = new BigDecimal("0.50");

    @Column(precision = 18, scale = 2)
    private BigDecimal maxCommission;

    @Column(length = 500)
    private String description;

    @Builder.Default
    private boolean active = true;

    private LocalDateTime effectiveFrom;

    private LocalDateTime effectiveTo;

    @Column(name = "CreatedAt")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "UpdatedAt")
    private LocalDateTime updatedAt;
}
