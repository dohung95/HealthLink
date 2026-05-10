package com.HealthLink.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "Users")
@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class User {
    @Id
    @Column(name = "Id", length = 450)
    private String id;

    @Column(name = "UserName", length = 256, nullable = false)
    private String username;

    @Column(name = "Email", length = 256, nullable = false)
    private String email;

    @Column(name = "EmailConfirmed", nullable = false)
    @Builder.Default
    private boolean emailConfirmed = false;

    @Column(name = "PasswordHash", nullable = false)
    private String password;

    @Column(name = "PhoneNumber", nullable = false)
    private String phoneNumber;

    @Column(name = "AccessFailedCount", nullable = false)
    @Builder.Default
    private int accessFailedCount = 0;
    
    @Builder.Default
    @Column(name = "CreatedDate", nullable = false)
    private LocalDateTime createdDate = LocalDateTime.now();

    @Builder.Default
    @Column(name = "Status", length = 20, nullable = false)
    private String status = "Active";

    @Builder.Default
    @Column(name = "LastLoginAt", nullable = true)
    private LocalDateTime lastLoginAt = LocalDateTime.now();

    // --- Relationships ---
    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Patient patient;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Doctor doctor;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Pharmacy pharmacy;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "RoleId", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Role role;

    @OneToMany(mappedBy = "user")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<RefreshToken> refreshTokens;

    @OneToMany(mappedBy = "user")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<Notification> notifications;

    @OneToMany(mappedBy = "sender")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<Message> messagesSent;

    @OneToMany(mappedBy = "receiver")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<Message> messagesReceived;
}