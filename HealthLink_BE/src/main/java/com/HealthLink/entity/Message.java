package com.HealthLink.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "ChatMessages")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "MessageID", columnDefinition = "VARCHAR(36)")
    private String messageId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ChatRoomId", nullable = false)
    @ToString.Exclude
    private ChatRoom chatRoom;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "SenderId", nullable = false)
    @ToString.Exclude
    private User sender;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ReceiverId", nullable = false)
    @ToString.Exclude
    private User receiver;

    @Convert(converter = com.HealthLink.security.AesEncryptor.class)
    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String content;

    private String photoURL;

    @Column(columnDefinition = "TEXT")
    private String imageUrl;

    @Column(name = "IsRead")
    @Builder.Default
    private boolean read = false;

    @Column(name = "SentAt", nullable = false)
    private LocalDateTime timestamp;

    @PrePersist
    protected void onCreate() {
        if (timestamp == null) {
            timestamp = LocalDateTime.now();
        }
    }
}
