package com.HealthLink.service.notification;

import com.HealthLink.dto.notification.FcmTokenRequest;
import com.HealthLink.dto.notification.NotificationResponse;
import com.HealthLink.entity.DeviceToken;
import com.HealthLink.entity.Notification;
import com.HealthLink.entity.User;
import com.HealthLink.entity.enums.NotificationChannel;
import com.HealthLink.entity.enums.NotificationPriority;
import com.HealthLink.entity.enums.NotificationType;
import com.HealthLink.repository.notification.DeviceTokenRepository;
import com.HealthLink.repository.notification.NotificationRepository;
import com.HealthLink.service.impl.auth.UserDetailsServiceImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Service: NotificationService
 *
 * Điều phối toàn bộ nghiệp vụ thông báo:
 * 1. Lưu thông báo vào DB (luôn luôn)
 * 2. Đẩy thông báo qua kênh phù hợp (WebSocket / FCM / Email)
 * 3. Quản lý FCM token của thiết bị di động
 * 4. Đánh dấu đã đọc / lấy danh sách thông báo
 *
 * Bảo mật: mọi thao tác đều kiểm tra userId từ SecurityContext để đảm bảo
 * người dùng chỉ truy cập thông báo của chính họ.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class NotificationService {

    private final NotificationRepository       notificationRepository;
    private final DeviceTokenRepository        deviceTokenRepository;
    private final WebSocketNotificationService webSocketService;
    private final FirebaseNotificationService  firebaseService;

    // =========================================================================
    // 1. GỬI THÔNG BÁO (được gọi nội bộ từ các service khác)
    // =========================================================================

    /**
     * Tạo và gửi thông báo WebSocket đến Doctor/Pharmacy (web UI).
     *
     * @param user     User nhận thông báo (Doctor hoặc Pharmacy)
     * @param type     Loại thông báo
     * @param title    Tiêu đề
     * @param message  Nội dung
     * @param relatedId ID đối tượng liên quan (AppointmentID, v.v.)
     * @param actionUrl URL điều hướng khi click
     */
    public void sendWebSocketNotification(User user, NotificationType type,
                                          String title, String message,
                                          Integer relatedId, String actionUrl) {
        // Lưu vào DB trước
        Notification notification = saveNotification(user, type, title, message,
                NotificationChannel.WEB_SOCKET, NotificationPriority.NORMAL, relatedId, actionUrl);

        // Đẩy realtime qua WebSocket (bất đồng bộ)
        webSocketService.sendToUser(user.getId(), notification);

        log.info("WebSocket notification dispatched: type={}, userId={}", type, user.getId());
    }

    /**
     * Tạo và gửi thông báo FCM đến Bệnh nhân (mobile app).
     *
     * @param user     User nhận thông báo (Patient)
     * @param type     Loại thông báo
     * @param title    Tiêu đề
     * @param message  Nội dung
     * @param priority Mức ưu tiên
     * @param relatedId ID đối tượng liên quan
     * @param actionUrl URL điều hướng
     */
    public void sendMobilePushNotification(User user, NotificationType type,
                                           String title, String message,
                                           NotificationPriority priority,
                                           Integer relatedId, String actionUrl) {
        // Lưu vào DB
        saveNotification(user, type, title, message,
                NotificationChannel.MOBILE_PUSH, priority, relatedId, actionUrl);

        // Gửi FCM đến tất cả thiết bị active của user (bất đồng bộ)
        firebaseService.sendToUser(user.getId(), title, message);

        log.info("Mobile push notification dispatched: type={}, userId={}", type, user.getId());
    }

    // =========================================================================
    // 2. QUẢN LÝ FCM TOKEN
    // =========================================================================

    /**
     * Đăng ký FCM token mới từ thiết bị di động của bệnh nhân.
     * Nếu token đã tồn tại thì bỏ qua (idempotent).
     *
     * @param user    User đang đăng nhập (Patient)
     * @param request Thông tin token cần đăng ký
     */
    public void registerFcmToken(User user, FcmTokenRequest request) {
        // Kiểm tra trùng lặp trước khi lưu
        if (deviceTokenRepository.existsByUser_IdAndToken(user.getId(), request.getToken())) {
            log.debug("FCM token already registered for userId={}", user.getId());
            return;
        }

        DeviceToken deviceToken = DeviceToken.builder()
                .user(user)
                .token(request.getToken())
                .deviceName(request.getDeviceName())
                .platform(request.getPlatform())
                .active(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        deviceTokenRepository.save(deviceToken);
        log.info("FCM token registered for userId={}, platform={}",
                user.getId(), request.getPlatform());
    }

    /**
     * Xóa (deactivate) FCM token khi bệnh nhân đăng xuất.
     * Tránh gửi nhầm thông báo đến session cũ.
     *
     * @param user  User đang đăng xuất
     * @param token Chuỗi FCM token cần xóa
     */
    public void removeFcmToken(User user, String token) {
        // Chỉ deactivate token thuộc về user này (bảo mật)
        if (deviceTokenRepository.existsByUser_IdAndToken(user.getId(), token)) {
            deviceTokenRepository.deactivateByToken(token);
            log.info("FCM token deactivated for userId={}", user.getId());
        } else {
            log.warn("Token not found for userId={} — no action taken", user.getId());
        }
    }

    /**
     * Deactivate tất cả token của user (logout khỏi mọi thiết bị).
     *
     * @param userId ID của user
     */
    public void removeAllFcmTokens(String userId) {
        deviceTokenRepository.deactivateAllByUserId(userId);
        log.info("All FCM tokens deactivated for userId={}", userId);
    }

    // =========================================================================
    // 3. ĐỌC / ĐÁNH DẤU THÔNG BÁO
    // =========================================================================

    /**
     * Lấy danh sách thông báo phân trang của user.
     * Chỉ trả về thông báo của chính user đang đăng nhập.
     *
     * @param userId   ID của user
     * @param pageable Thông tin phân trang
     * @return Trang NotificationResponse
     */
    @Transactional(readOnly = true)
    public Page<NotificationResponse> getNotifications(String userId, Pageable pageable) {
        return notificationRepository
                .findByUser_IdOrderByCreatedAtDesc(userId, pageable)
                .map(this::mapToResponse);
    }

    /**
     * Đếm số thông báo chưa đọc của user (dùng để hiển thị badge).
     *
     * @param userId ID của user
     * @return Số lượng thông báo chưa đọc
     */
    @Transactional(readOnly = true)
    public long countUnread(String userId) {
        return notificationRepository.countByUser_IdAndReadFalse(userId);
    }

    /**
     * Đánh dấu một thông báo là đã đọc.
     * Kiểm tra quyền: chỉ owner của thông báo mới được thao tác.
     *
     * @param notificationId ID thông báo
     * @param userId         ID của user đang đăng nhập
     */
    public void markAsRead(Integer notificationId, String userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Notification not found: " + notificationId));

        // Kiểm tra quyền sở hữu
        if (!notification.getUser().getId().equals(userId)) {
            throw new SecurityException("Access denied: not your notification");
        }

        notification.setRead(true);
        notificationRepository.save(notification);
        log.debug("Notification {} marked as read by userId={}", notificationId, userId);
    }

    /**
     * Đánh dấu tất cả thông báo của user là đã đọc.
     *
     * @param userId ID của user
     * @return Số lượng thông báo được đánh dấu
     */
    public int markAllAsRead(String userId) {
        int count = notificationRepository.markAllAsReadByUserId(userId);
        log.info("Marked {} notifications as read for userId={}", count, userId);
        return count;
    }

    /**
     * Xóa một thông báo.
     * Kiểm tra quyền: chỉ owner của thông báo mới được xóa.
     *
     * @param notificationId ID thông báo
     * @param userId         ID của user đang đăng nhập
     * @return true nếu xóa thành công
     */
    public boolean deleteNotification(Integer notificationId, String userId) {
        int deleted = notificationRepository.deleteByNotificationIdAndUserId(notificationId, userId);

        if (deleted == 0) {
            log.warn("Delete failed: notification {} not found or not owned by userId={}",
                    notificationId, userId);
            return false;
        }

        log.info("Notification {} deleted by userId={}", notificationId, userId);
        return true;
    }

    // =========================================================================
    // 4. HELPER METHODS (nội bộ)
    // =========================================================================

    /**
     * Lưu thông báo vào DB.
     */
    private Notification saveNotification(User user, NotificationType type,
                                          String title, String message,
                                          NotificationChannel channel,
                                          NotificationPriority priority,
                                          Integer relatedId, String actionUrl) {
        Notification notification = Notification.builder()
                .user(user)
                .type(type)
                .title(title)
                .message(message)
                .sentVia(channel)
                .priority(priority)
                .read(false)
                .relatedId(relatedId)
                .actionUrl(actionUrl)
                .createdAt(LocalDateTime.now())
                .build();

        return notificationRepository.save(notification);
    }

    /**
     * Map từ Notification entity sang NotificationResponse DTO.
     */
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
