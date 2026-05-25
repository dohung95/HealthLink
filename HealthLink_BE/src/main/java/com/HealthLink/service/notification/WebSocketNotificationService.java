package com.HealthLink.service.notification;

import com.HealthLink.dto.notification.NotificationResponse;
import com.HealthLink.entity.Notification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Service: WebSocketNotificationService
 *
 * Đẩy thông báo realtime đến Bác sĩ và Nhà thuốc thông qua WebSocket (STOMP).
 * Mỗi user nhận thông báo tại channel riêng: /user/{userId}/queue/notifications
 *
 * Dùng @Async để không block luồng chính khi gửi WebSocket message.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WebSocketNotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Gửi thông báo realtime đến một user cụ thể qua WebSocket.
     * Destination: /user/{userId}/queue/notifications
     *
     * @param userId       ID của user nhận thông báo (Doctor / Pharmacy)
     * @param notification Entity Notification đã được lưu vào DB
     */
    @Async
    public void sendToUser(String userId, Notification notification) {
        // Tạo DTO trước để không expose entity ra ngoài
        NotificationResponse payload = mapToResponse(notification);
        String destination = "/queue/notifications";

        log.info("Sending WebSocket notification to userId={}, type={}", userId, notification.getType());

        try {
            // Gửi đến channel riêng của user: /user/{userId}/queue/notifications
            messagingTemplate.convertAndSendToUser(userId, destination, payload);
            log.info("WebSocket notification sent successfully to userId={}", userId);
        } catch (Exception ex) {
            log.error("Failed to send WebSocket notification to userId={}: {}", userId, ex.getMessage());
        }
    }

    /**
     * Gửi thông báo broadcast đến một topic chung (ví dụ: thông báo hệ thống).
     *
     * @param topic   Tên topic, ví dụ: /topic/system-alert
     * @param message Nội dung text thông báo
     */
    @Async
    public void broadcast(String topic, String message) {
        log.info("Broadcasting to topic={}: {}", topic, message);
        try {
            messagingTemplate.convertAndSend(topic, message);
        } catch (Exception ex) {
            log.error("Broadcast failed to topic={}: {}", topic, ex.getMessage());
        }
    }

    // -------------------------------------------------------------------------
    // Mapper: Notification entity → NotificationResponse DTO
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
                .metadata(n.getMetadata())
                .createdAt(n.getCreatedAt())
                .expiresAt(n.getExpiresAt())
                .relatedId(n.getRelatedId())
                .build();
    }
}
