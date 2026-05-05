import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "Notifications")
@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "NotificationID")
    private Integer notificationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "UserId", nullable = false)
    @ToString.Exclude
    private User user;

    @Column(length = 100)
    private String type;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    private Integer relatedId;
    private Boolean isRead = false;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    private Integer appointmentId;

    @Column(length = 200)
    private String title;

    @Column(length = 500)
    private String imageUrl;

    @Column(length = 500)
    private String actionUrl;

    @Column(length = 20)
    private String priority;

    private LocalDateTime expiresAt;

    @Column(length = 50)
    private String sentVia;
}