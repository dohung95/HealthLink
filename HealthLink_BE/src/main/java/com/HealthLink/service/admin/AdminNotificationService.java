package com.HealthLink.service.admin;

import com.HealthLink.dto.notification.NotificationResponse;
import com.HealthLink.entity.Notification;
import com.HealthLink.entity.User;
import com.HealthLink.entity.enums.NotificationChannel;
import com.HealthLink.entity.enums.NotificationPriority;
import com.HealthLink.entity.enums.NotificationType;
import com.HealthLink.repository.admin.AdminNotificationRepository;
import com.HealthLink.repository.auth.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Service: AdminNotificationService
 * Package: com.HealthLink.service.admin
 *
 * Điều phối toàn bộ nghiệp vụ thông báo cho Admin:
 *  1. Tạo và gửi thông báo đến tất cả Admin users
 *  2. Quản lý notifications (đánh dấu đã đọc, xóa, lọc)
 *  3. Thống kê notifications
 *  4. Helper methods cho các sự kiện hệ thống
 *
 * Tích hợp:
 *  - AdminNotificationRepository: CRUD operations
 *  - AdminWebSocketNotificationService: Realtime push
 *  - UserRepository: Lấy danh sách Admin users
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AdminNotificationService {

    private final AdminNotificationRepository adminNotificationRepository;
    private final AdminWebSocketNotificationService adminWebSocketService;
    private final UserRepository userRepository;

    // =========================================================================
    // 1. GỬI THÔNG BÁO ĐẾN ADMIN
    // =========================================================================

    /**
     * Gửi thông báo đến TẤT CẢ Admin users.
     * Lưu vào DB cho từng admin + push realtime qua WebSocket.
     *
     * @param type      Loại thông báo
     * @param title     Tiêu đề
     * @param message   Nội dung
     * @param priority  Mức độ ưu tiên
     * @param relatedId ID đối tượng liên quan (nullable)
     * @param actionUrl URL điều hướng khi click
     */
    public void notifyAllAdmins(NotificationType type, String title, String message,
                                 NotificationPriority priority, Integer relatedId, String actionUrl) {
        List<User> adminUsers = userRepository.findByRole_NameIgnoreCase("Admin");

        if (adminUsers.isEmpty()) {
            log.warn("[AdminNotif] No admin users found to send notification");
            return;
        }

        log.info("[AdminNotif] Sending {} notification to {} admin(s): {}",
                type, adminUsers.size(), title);

        for (User admin : adminUsers) {
            try {
                // Lưu vào DB
                Notification notification = saveNotification(
                        admin, type, title, message, priority, relatedId, actionUrl);

                // Push realtime
                adminWebSocketService.sendToAdmin(admin.getId(), notification);

            } catch (Exception e) {
                log.error("[AdminNotif] Failed to notify admin {}: {}",
                        admin.getEmail(), e.getMessage());
            }
        }
    }

    /**
     * Gửi thông báo đến TẤT CẢ Admin với priority mặc định là NORMAL.
     */
    public void notifyAllAdmins(NotificationType type, String title, String message,
                                 Integer relatedId, String actionUrl) {
        notifyAllAdmins(type, title, message, NotificationPriority.NORMAL, relatedId, actionUrl);
    }

    /**
     * Gửi thông báo đến một Admin user cụ thể.
     *
     * @param adminUser Admin user nhận thông báo
     * @param type      Loại thông báo
     * @param title     Tiêu đề
     * @param message   Nội dung
     * @param relatedId ID đối tượng liên quan
     * @param actionUrl URL điều hướng
     */
    public void notifyAdmin(User adminUser, NotificationType type, String title,
                            String message, Integer relatedId, String actionUrl) {
        Notification notification = saveNotification(
                adminUser, type, title, message,
                NotificationPriority.NORMAL, relatedId, actionUrl);

        adminWebSocketService.sendToAdmin(adminUser.getId(), notification);

        log.info("[AdminNotif] Sent {} notification to admin {}", type, adminUser.getEmail());
    }

    // =========================================================================
    // 1.5. GỬI THÔNG BÁO CHO DOCTOR / PATIENT (từ Admin actions)
    // =========================================================================

    /**
     * Gửi thông báo WebSocket đến một user (Doctor/Patient/Pharmacy).
     * Dùng khi Admin thực hiện actions ảnh hưởng đến user khác.
     *
     * @param userId    ID của user nhận
     * @param type      Loại thông báo
     * @param title     Tiêu đề
     * @param message   Nội dung
     * @param relatedId ID đối tượng liên quan
     */
    public void sendWebSocketNotification(String userId, NotificationType type,
                                          String title, String message, Integer relatedId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            log.warn("[AdminNotif] User not found: {}", userId);
            return;
        }

        Notification notification = saveNotificationForUser(
                user, type, title, message,
                NotificationPriority.NORMAL, relatedId, null);

        adminWebSocketService.sendToUser(userId, notification);

        log.info("[AdminNotif] Sent {} notification to userId={}", type, userId);
    }

    /**
     * Gửi thông báo mobile push đến Patient (qua WebSocket vì không dùng FCM của team khác).
     * Trong hệ thống Admin, tất cả đều gửi qua WebSocket.
     *
     * @param userId    ID của patient user
     * @param type      Loại thông báo
     * @param title     Tiêu đề
     * @param message   Nội dung
     * @param relatedId ID đối tượng liên quan
     */
    public void sendMobilePushNotification(String userId, NotificationType type,
                                           String title, String message, Integer relatedId) {
        // Trong hệ thống Admin độc lập, gửi qua WebSocket thay vì FCM
        // để không phụ thuộc vào FirebaseNotificationService của team khác
        sendWebSocketNotification(userId, type, title, message, relatedId);
    }

    /**
     * Lưu notification cho một user bất kỳ (không chỉ Admin).
     */
    private Notification saveNotificationForUser(User user, NotificationType type,
                                                  String title, String message,
                                                  NotificationPriority priority,
                                                  Integer relatedId, String actionUrl) {
        Notification notification = Notification.builder()
                .user(user)
                .type(type)
                .title(title)
                .message(message)
                .sentVia(NotificationChannel.WEB_SOCKET)
                .priority(priority)
                .read(false)
                .relatedId(relatedId)
                .actionUrl(actionUrl)
                .createdAt(LocalDateTime.now())
                .build();

        return adminNotificationRepository.save(notification);
    }

    // =========================================================================
    // 2. HELPER METHODS CHO CÁC SỰ KIỆN HỆ THỐNG
    // =========================================================================

    /**
     * Thông báo có yêu cầu đăng ký mới từ Doctor/Pharmacy.
     */
    public void notifyNewRegistration(String registrationType, String applicantName,
                                       Integer registrationId) {
        String title = "New " + registrationType + " Registration";
        String message = String.format(
                "%s has submitted a registration request as %s. Please review.",
                applicantName, registrationType);
        String actionUrl = "/admin/registrations";

        notifyAllAdmins(NotificationType.NEW_REGISTRATION, title, message,
                NotificationPriority.HIGH, registrationId, actionUrl);
    }

    /**
     * Thông báo có lịch hẹn mới được đặt.
     */
    public void notifyNewAppointment(String patientName, String doctorName,
                                      Integer appointmentId) {
        String title = "New Appointment Booked";
        String message = String.format(
                "%s has booked an appointment with Dr. %s",
                patientName, doctorName);
        String actionUrl = "/admin/appointments";

        notifyAllAdmins(NotificationType.NEW_APPOINTMENT, title, message,
                NotificationPriority.NORMAL, appointmentId, actionUrl);
    }

    /**
     * Thông báo có lịch hẹn bị hủy.
     */
    public void notifyAppointmentCancelled(String cancelledBy, Integer appointmentId,
                                            String reason) {
        String title = "Appointment Cancelled";
        String message = reason != null
                ? String.format("Appointment #%d was cancelled by %s. Reason: %s",
                        appointmentId, cancelledBy, reason)
                : String.format("Appointment #%d was cancelled by %s",
                        appointmentId, cancelledBy);
        String actionUrl = "/admin/appointments";

        notifyAllAdmins(NotificationType.CANCEL_APPOINTMENT, title, message,
                NotificationPriority.HIGH, appointmentId, actionUrl);
    }

    /**
     * Thông báo có giao dịch hoa hồng mới.
     */
    public void notifyNewCommission(Double amount, String recipientType,
                                     Integer transactionId) {
        String title = "New Commission Transaction";
        String message = String.format(
                "Commission of $%.2f recorded for %s",
                amount, recipientType);
        String actionUrl = "/admin/commission";

        notifyAllAdmins(NotificationType.NEW_COMMISSION, title, message,
                NotificationPriority.NORMAL, transactionId, actionUrl);
    }

    /**
     * Thông báo có thanh toán mới.
     */
    public void notifyPaymentReceived(Double amount, String payerName,
                                       Integer paymentId) {
        String title = "Payment Received";
        String message = String.format(
                "Payment of $%.2f received from %s",
                amount, payerName);
        String actionUrl = "/admin";

        notifyAllAdmins(NotificationType.INVOICE_PAID, title, message,
                NotificationPriority.NORMAL, paymentId, actionUrl);
    }

    // =========================================================================
    // 3. QUẢN LÝ NOTIFICATIONS
    // =========================================================================

    /**
     * Lấy danh sách notifications của admin user (phân trang).
     */
    @Transactional(readOnly = true)
    public Page<NotificationResponse> getNotifications(String adminUserId, Pageable pageable) {
        return adminNotificationRepository
                .findByUser_IdOrderByCreatedAtDesc(adminUserId, pageable)
                .map(this::mapToResponse);
    }

    /**
     * Lấy danh sách notifications theo loại (phân trang).
     */
    @Transactional(readOnly = true)
    public Page<NotificationResponse> getNotificationsByType(String adminUserId,
                                                              NotificationType type,
                                                              Pageable pageable) {
        return adminNotificationRepository
                .findByUser_IdAndTypeOrderByCreatedAtDesc(adminUserId, type, pageable)
                .map(this::mapToResponse);
    }

    /**
     * Đếm số notifications chưa đọc.
     */
    @Transactional(readOnly = true)
    public long countUnread(String adminUserId) {
        return adminNotificationRepository.countByUser_IdAndReadFalse(adminUserId);
    }

    /**
     * Đếm số notifications chưa đọc theo loại.
     */
    @Transactional(readOnly = true)
    public Map<NotificationType, Long> countUnreadByType(String adminUserId) {
        return List.of(
                NotificationType.NEW_REGISTRATION,
                NotificationType.NEW_APPOINTMENT,
                NotificationType.CANCEL_APPOINTMENT,
                NotificationType.NEW_COMMISSION,
                NotificationType.INVOICE_PAID
        ).stream().collect(Collectors.toMap(
                type -> type,
                type -> adminNotificationRepository.countByUser_IdAndTypeAndReadFalse(adminUserId, type)
        ));
    }

    /**
     * Đánh dấu một notification là đã đọc.
     */
    public void markAsRead(Integer notificationId, String adminUserId) {
        Notification notification = adminNotificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Notification not found: " + notificationId));

        if (!notification.getUser().getId().equals(adminUserId)) {
            throw new SecurityException("Access denied: not your notification");
        }

        notification.setRead(true);
        adminNotificationRepository.save(notification);

        log.debug("[AdminNotif] Notification {} marked as read by adminId={}",
                notificationId, adminUserId);
    }

    /**
     * Đánh dấu tất cả notifications là đã đọc.
     */
    public int markAllAsRead(String adminUserId) {
        int count = adminNotificationRepository.markAllAsReadByUserId(adminUserId);
        log.info("[AdminNotif] Marked {} notifications as read for adminId={}", count, adminUserId);
        return count;
    }

    /**
     * Đánh dấu tất cả notifications theo loại là đã đọc.
     */
    public int markAllAsReadByType(String adminUserId, NotificationType type) {
        int count = adminNotificationRepository.markAllAsReadByUserIdAndType(adminUserId, type);
        log.info("[AdminNotif] Marked {} {} notifications as read for adminId={}",
                count, type, adminUserId);
        return count;
    }

    /**
     * Xóa một notification.
     */
    public boolean deleteNotification(Integer notificationId, String adminUserId) {
        int deleted = adminNotificationRepository.deleteByNotificationIdAndUserId(
                notificationId, adminUserId);

        if (deleted == 0) {
            log.warn("[AdminNotif] Delete failed: notification {} not found or not owned by adminId={}",
                    notificationId, adminUserId);
            return false;
        }

        log.info("[AdminNotif] Notification {} deleted by adminId={}", notificationId, adminUserId);
        return true;
    }

    /**
     * Xóa các notifications cũ (cleanup).
     *
     * @param adminUserId ID của admin
     * @param daysOld     Số ngày tuổi tối thiểu để xóa
     * @return Số notifications đã xóa
     */
    public int deleteOldNotifications(String adminUserId, int daysOld) {
        LocalDateTime threshold = LocalDateTime.now().minusDays(daysOld);
        int deleted = adminNotificationRepository.deleteOldNotifications(adminUserId, threshold);
        log.info("[AdminNotif] Deleted {} old notifications (older than {} days) for adminId={}",
                deleted, daysOld, adminUserId);
        return deleted;
    }

    // =========================================================================
    // 4. THỐNG KÊ
    // =========================================================================

    /**
     * Lấy thống kê notifications trong khoảng thời gian.
     */
    @Transactional(readOnly = true)
    public Map<NotificationType, Long> getStatistics(String adminUserId,
                                                      LocalDateTime from,
                                                      LocalDateTime to) {
        return List.of(
                NotificationType.NEW_REGISTRATION,
                NotificationType.NEW_APPOINTMENT,
                NotificationType.CANCEL_APPOINTMENT,
                NotificationType.NEW_COMMISSION,
                NotificationType.INVOICE_PAID
        ).stream().collect(Collectors.toMap(
                type -> type,
                type -> adminNotificationRepository.countByUserIdAndTypeAndCreatedAtBetween(
                        adminUserId, type, from, to)
        ));
    }

    // =========================================================================
    // HELPER METHODS
    // =========================================================================

    /**
     * Lưu notification vào DB.
     */
    private Notification saveNotification(User user, NotificationType type,
                                          String title, String message,
                                          NotificationPriority priority,
                                          Integer relatedId, String actionUrl) {
        Notification notification = Notification.builder()
                .user(user)
                .type(type)
                .title(title)
                .message(message)
                .sentVia(NotificationChannel.WEB_SOCKET)
                .priority(priority)
                .read(false)
                .relatedId(relatedId)
                .actionUrl(actionUrl)
                .createdAt(LocalDateTime.now())
                .build();

        return adminNotificationRepository.save(notification);
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
