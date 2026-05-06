package com.HealthLink.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "RefreshTokens")
@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class RefreshToken {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "UserId", nullable = false)
    @ToString.Exclude
    private User user;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String token;

    @Column(nullable = false)
    private LocalDateTime expiryDate;

    private boolean isRevoked = false;

    @Column(nullable = false)
    private LocalDateTime createdDate = LocalDateTime.now();

    @Column(length = 500)
    private String deviceInfo;

    @Column(length = 50)
    private String ipAddress;

    @Column(length = 500)
    private String userAgent;
}