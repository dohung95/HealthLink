package com.HealthLink.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Lưu trữ token để xác nhận thay đổi email.
 * Token sẽ hết hạn sau 24 giờ và bị vô hiệu hóa sau khi dùng.
 */
@Entity
@Table(name = "EmailVerificationTokens")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailVerificationToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "Id")
    private Long id;

    @Column(name = "Token", nullable = false, unique = true, length = 450)
    private String token;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "UserId", nullable = false)
    @ToString.Exclude
    private User user;

    @Column(name = "NewEmail", nullable = false, length = 256)
    private String newEmail;

    @Column(name = "ExpiryDate", nullable = false)
    private LocalDateTime expiryDate;

    @Builder.Default
    @Column(name = "Used", nullable = false)
    private boolean used = false;

    @Column(name = "CreatedAt", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    // =========================================================================
    // Helper
    // =========================================================================
    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiryDate);
    }

    public boolean isValid() {
        return !used && !isExpired();
    }
}
