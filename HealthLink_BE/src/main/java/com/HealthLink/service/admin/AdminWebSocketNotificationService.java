package com.HealthLink.service.admin;

import com.HealthLink.dto.notification.NotificationResponse;
import com.HealthLink.entity.Notification;
import com.HealthLink.entity.User;
import com.HealthLink.repository.auth.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Service: AdminWebSocketNotificationService
 * Package: com.HealthLink.service.admin
 *
 * Đẩy thông báo realtime đến Admin users thông qua WebSocket (STOMP).
 * Mỗi admin nhận thông báo tại channel riêng: /user/{userId}/queue/notifications
 *
 * Khác với WebSocketNotificationService chung:
 *  - Tự động gửi đến TẤT CẢ admin users
 *  - Hỗ trợ broadcast đến topic admin chung
 *  - Dùng @Async để không block luồng chính
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdminWebSocketNotificationService {

    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;

    private static final String NOTIFICATION_DESTINATION = "/queue/notifications";
    private static final String ADMIN_TOPIC = "/topic/admin/notifications";

    /**
     * Gửi thông báo realtime đến một admin user cụ thể qua WebSocket.
     * Destination: /user/{userId}/queue/notifications
     *
     * @param userId       ID của admin user
     * @param notification Entity Notification đã được lưu vào DB
     */
    @Async
    public void sendToAdmin(String userId, Notification notification) {
        NotificationResponse payload = mapToResponse(notification);

        log.info("[AdminWS] Sending notification to adminId={}, type={}", userId, notification.getType());

        try {
            messagingTemplate.convertAndSendToUser(userId, NOTIFICATION_DESTINATION, payload);
            log.info("[AdminWS] Notification sent successfully to adminId={}", userId);
        } catch (Exception ex) {
            log.error("[AdminWS] Failed to send notification to adminId={}: {}", userId, ex.getMessage());
        }
    }

    /**
     * Gửi thông báo đến TẤT CẢ admin users.
     * Tự động lấy danh sách admin từ database và gửi từng người.
     *
     * @param notification Entity Notification đã được lưu vào DB
     */
    @Async
    public void sendToAllAdmins(Notification notification) {
        List<User> adminUsers = userRepository.findByRole_NameIgnoreCase("Admin");

        if (adminUsers.isEmpty()) {
            log.warn("[AdminWS] No admin users found to send notification");
            return;
        }

        NotificationResponse payload = mapToResponse(notification);

        log.info("[AdminWS] Broadcasting notification to {} admin(s), type={}",
                adminUsers.size(), notification.getType());

        for (User admin : adminUsers) {
            try {
                messagingTemplate.convertAndSendToUser(admin.getId(), NOTIFICATION_DESTINATION, payload);
            } catch (Exception ex) {
                log.error("[AdminWS] Failed to send to admin {}: {}", admin.getEmail(), ex.getMessage());
            }
        }
    }

    /**
     * Gửi thông báo đến TẤT CẢ admin users với NotificationResponse đã build sẵn.
     *
     * @param payload NotificationResponse DTO
     */
    @Async
    public void sendToAllAdmins(NotificationResponse payload) {
        List<User> adminUsers = userRepository.findByRole_NameIgnoreCase("Admin");

        if (adminUsers.isEmpty()) {
            log.warn("[AdminWS] No admin users found to send notification");
            return;
        }

        log.info("[AdminWS] Broadcasting notification to {} admin(s), type={}",
                adminUsers.size(), payload.getType());

        for (User admin : adminUsers) {
            try {
                messagingTemplate.convertAndSendToUser(admin.getId(), NOTIFICATION_DESTINATION, payload);
            } catch (Exception ex) {
                log.error("[AdminWS] Failed to send to admin {}: {}", admin.getEmail(), ex.getMessage());
            }
        }
    }

    /**
     * Broadcast thông báo đến admin topic chung.
     * Destination: /topic/admin/notifications
     *
     * Dùng cho các thông báo hệ thống chung mà TẤT CẢ admin cần biết.
     *
     * @param notification Entity Notification
     */
    @Async
    public void broadcastToAdminTopic(Notification notification) {
        NotificationResponse payload = mapToResponse(notification);

        log.info("[AdminWS] Broadcasting to {}: type={}", ADMIN_TOPIC, notification.getType());

        try {
            messagingTemplate.convertAndSend(ADMIN_TOPIC, payload);
            log.info("[AdminWS] Broadcast to {} successful", ADMIN_TOPIC);
        } catch (Exception ex) {
            log.error("[AdminWS] Broadcast to {} failed: {}", ADMIN_TOPIC, ex.getMessage());
        }
    }

    /**
     * Broadcast message text đơn giản đến admin topic.
     *
     * @param message Nội dung text
     */
    @Async
    public void broadcastMessage(String message) {
        log.info("[AdminWS] Broadcasting message to {}: {}", ADMIN_TOPIC, message);

        try {
            messagingTemplate.convertAndSend(ADMIN_TOPIC, message);
        } catch (Exception ex) {
            log.error("[AdminWS] Broadcast message failed: {}", ex.getMessage());
        }
    }

    /**
     * Gửi thông báo đến danh sách admin users cụ thể.
     *
     * @param adminUserIds Danh sách ID của admin users
     * @param notification Entity Notification
     */
    @Async
    public void sendToAdmins(List<String> adminUserIds, Notification notification) {
        NotificationResponse payload = mapToResponse(notification);

        log.info("[AdminWS] Sending notification to {} specific admin(s)", adminUserIds.size());

        for (String adminId : adminUserIds) {
            try {
                messagingTemplate.convertAndSendToUser(adminId, NOTIFICATION_DESTINATION, payload);
            } catch (Exception ex) {
                log.error("[AdminWS] Failed to send to adminId={}: {}", adminId, ex.getMessage());
            }
        }
    }

    // =========================================================================
    // GỬI NOTIFICATION CHO DOCTOR / PATIENT (từ Admin actions)
    // =========================================================================

    /**
     * Gửi thông báo WebSocket đến một user bất kỳ (Doctor, Patient, Pharmacy).
     * Dùng khi Admin thực hiện actions ảnh hưởng đến user khác.
     *
     * @param userId       ID của user nhận
     * @param notification Entity Notification đã lưu DB
     */
    @Async
    public void sendToUser(String userId, Notification notification) {
        NotificationResponse payload = mapToResponse(notification);

        log.info("[AdminWS] Sending notification to userId={}, type={}", userId, notification.getType());

        try {
            messagingTemplate.convertAndSendToUser(userId, NOTIFICATION_DESTINATION, payload);
            log.info("[AdminWS] Notification sent successfully to userId={}", userId);
        } catch (Exception ex) {
            log.error("[AdminWS] Failed to send notification to userId={}: {}", userId, ex.getMessage());
        }
    }

    /**
     * Gửi thông báo WebSocket đến một user với payload đã build sẵn.
     *
     * @param userId  ID của user nhận
     * @param payload NotificationResponse DTO
     */
    @Async
    public void sendToUser(String userId, NotificationResponse payload) {
        log.info("[AdminWS] Sending notification to userId={}, type={}", userId, payload.getType());

        try {
            messagingTemplate.convertAndSendToUser(userId, NOTIFICATION_DESTINATION, payload);
            log.info("[AdminWS] Notification sent successfully to userId={}", userId);
        } catch (Exception ex) {
            log.error("[AdminWS] Failed to send notification to userId={}: {}", userId, ex.getMessage());
        }
    }

    // -------------------------------------------------------------------------
    // Mapper: Notification entity -> NotificationResponse DTO
    // -------------------------------------------------------------------------
    private NotificationResponse mapToResponse(Notification n) {
        return NotificationResponse.builder()
                .notificationId(n.getNotificationId())
                .title(n.getTitle())
                .message(n.getMessage())
                .type(n.getType())
                .sentVia(n.getSentVia())
                .priority(n.getPriority())
                .read(n.getRead())
                .actionUrl(n.getActionUrl())
                .imageUrl(n.getImageUrl())
                .createdAt(n.getCreatedAt())
                .expiresAt(n.getExpiresAt())
                .relatedId(n.getRelatedId())
                .build();
    }
}
