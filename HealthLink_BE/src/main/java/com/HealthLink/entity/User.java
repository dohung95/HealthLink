package com.HealthLink.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

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

    @Column(name = "EmailConfirmed")
    private boolean emailConfirmed;

    @Column(name = "PasswordHash")
    private String password;

    @Column(name = "PhoneNumber")
    private String phoneNumber;

    @Column(name = "AccessFailedCount")
    private int accessFailedCount = 0;
    
    @Column(name = "CreatedDate")
    private LocalDateTime createdDate = LocalDateTime.now();

    @Column(name = "Status", length = 20)
    private String status = "Inactive";

    @Column(name = "LastLoginAt")
    private LocalDateTime lastLoginAt;

    // --- Relationships ---
    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Patient patient;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Doctor doctor;

    @OneToOne(mappedBy = "user")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Pharmacy pharmacy;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "UserRoles",
        joinColumns = @JoinColumn(name = "UserId"),
        inverseJoinColumns = @JoinColumn(name = "RoleId")
    )
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Set<Role> roles;

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