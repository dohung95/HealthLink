package com.HealthLink.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "PartnerWithdrawalCredentials", uniqueConstraints = @UniqueConstraint(columnNames = "UserId"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PartnerWithdrawalCredential {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "Id")
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "UserId", nullable = false, unique = true)
    @ToString.Exclude
    private User user;

    @Column(name = "PinHash", nullable = false, length = 255)
    @ToString.Exclude
    private String pinHash;

    @Builder.Default
    @Column(name = "FailedAttempts", nullable = false)
    private int failedAttempts = 0;

    @Column(name = "LockedUntil")
    private LocalDateTime lockedUntil;

    @Builder.Default
    @Column(name = "CreatedAt", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    @Column(name = "UpdatedAt", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PrePersist
    @PreUpdate
    void touch() {
        updatedAt = LocalDateTime.now();
        if (createdAt == null) createdAt = updatedAt;
    }
}
