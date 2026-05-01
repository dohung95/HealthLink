package com.HealthLink.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "Users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @Column(name = "Id", length = 450)
    private String id;

    @Column(name = "UserName", length = 256)
    private String userName;

    @Column(name = "NormalizedUserName", length = 256)
    private String normalizedUserName;

    @Column(name = "Email", length = 256)
    private String email;

    @Column(name = "NormalizedEmail", length = 256)
    private String normalizedEmail;

    @Column(name = "EmailConfirmed")
    private boolean emailConfirmed;

    @Column(name = "PasswordHash")
    private String passwordHash;

    @Column(name = "SecurityStamp")
    private String securityStamp;

    @Column(name = "ConcurrencyStamp")
    private String concurrencyStamp;

    @Column(name = "PhoneNumber")
    private String phoneNumber;

    @Column(name = "PhoneNumberConfirmed")
    private boolean phoneNumberConfirmed;

    @Column(name = "TwoFactorEnabled")
    private boolean twoFactorEnabled;

    @Column(name = "LockoutEnd")
    private OffsetDateTime lockoutEnd;

    @Column(name = "LockoutEnabled")
    private boolean lockoutEnabled;

    @Column(name = "AccessFailedCount")
    private int accessFailedCount;

    @Column(name = "CreatedDate")
    private LocalDateTime createdDate;

    @Column(name = "Status", length = 20, nullable = false)
    @Builder.Default
    private String status = "Inactive";

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Patient patient;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Doctor doctor;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "UserRoles",
            joinColumns = @JoinColumn(name = "UserId"),
            inverseJoinColumns = @JoinColumn(name = "RoleId")
    )
    @Builder.Default
    private Set<Role> roles = new HashSet<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<RefreshToken> refreshTokens = new ArrayList<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Notification> notifications = new ArrayList<>();

    @OneToMany(mappedBy = "sender", fetch = FetchType.LAZY)
    @Builder.Default
    private List<Message> messagesSent = new ArrayList<>();

    @OneToMany(mappedBy = "receiver", fetch = FetchType.LAZY)
    @Builder.Default
    private List<Message> messagesReceived = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        if (createdDate == null) {
            createdDate = LocalDateTime.now();
        }
        if (status == null) {
            status = "Inactive";
        }
    }
}
