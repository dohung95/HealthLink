package com.HealthLink.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "ChatRooms")
@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ChatRoom {
    @Id
    @Column(name = "ChatRoomId", length = 900)
    private String chatRoomId;

    @Column(nullable = false, length = 450)
    private String user1Id;

    @Column(nullable = false, length = 450)
    private String user2Id;

    @Column(length = 256)
    private String user1DisplayName;
    private String user1PhotoURL;

    @Column(length = 256)
    private String user2DisplayName;
    private String user2PhotoURL;

    @Convert(converter = com.HealthLink.security.AesEncryptor.class)
    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String lastMessage;
    private LocalDateTime lastMessageAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "AppointmentId")
    @ToString.Exclude
    private Appointment appointment;

    @OneToMany(mappedBy = "chatRoom", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    @ToString.Exclude
    private List<Message> messages = new ArrayList<>();
}