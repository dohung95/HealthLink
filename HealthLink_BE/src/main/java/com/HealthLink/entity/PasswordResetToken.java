package com.HealthLink.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Lưu trữ token dùng để đặt lại mật khẩu.
 * Token sẽ hết hạn sau 15 phút và bị vô hiệu hóa sau khi dùng.
 */
@Entity
@Table(name = "PasswordResetTokens")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PasswordResetToken {

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

    @Column(name = "ExpiryDate", nullable = false)
    private LocalDateTime expiryDate;

    @Builder.Default
    @Column(name = "Used", nullable = false)
    private boolean used = false;

    // =========================================================================
    // Helper
    // =========================================================================
    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiryDate);
    }
}
